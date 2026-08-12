import { loadInfections, upsertInfection } from './infectionsService'
import { loadPatientSamples, upsertPatientSample } from './patientSamplesService'
import {
  SURVEILLANCE_CASE_STATUS,
  activateCaseFromPositiveSample,
  closeCaseFromNegativeSample,
  getSurveillanceCase,
  markCaseAwaitingLaboratory,
  upsertSurveillanceCase,
} from './surveillanceCasesService'

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase('el-GR')
}

export function isPatientSampleRecheck(sample = {}) {
  return Boolean(sample.isRecheck || sample.parentSampleId || sample.category === 'Επανέλεγχος')
}

function samePatient(left = {}, right = {}) {
  if (left.patientId && right.patientId && String(left.patientId) === String(right.patientId)) return true
  if (left.patientCode && right.patientCode && String(left.patientCode) === String(right.patientCode)) return true
  return Boolean(left.patientName && right.patientName && normalized(left.patientName) === normalized(right.patientName))
}

function workflowState(sample = {}) {
  const recheck = isPatientSampleRecheck(sample)
  if (sample.status === 'Θετικό') return recheck ? 'recheck-positive' : 'lab-confirmed-positive'
  if (sample.status === 'Αρνητικό') return recheck ? 'recheck-negative' : 'closed-negative'
  return recheck ? 'recheck-pending' : 'pending-laboratory'
}

function overallMicroorganism(sample = {}) {
  if (sample.microorganism) return sample.microorganism
  if (Array.isArray(sample.microorganismResults)) {
    return sample.microorganismResults.map((item) => item?.name || item?.microorganism).filter(Boolean).join(', ')
  }
  return ''
}

function findParentSample(sample, allSamples) {
  if (!sample.parentSampleId) return null
  return allSamples.find((item) => String(item.id) === String(sample.parentSampleId)) || null
}

function ensureRecheckIntegrity(sample, allSamples) {
  if (!isPatientSampleRecheck(sample)) return null
  const parent = findParentSample(sample, allSamples)
  if (!parent) throw new Error('Ο επανέλεγχος πρέπει να συνδεθεί με προηγούμενο δείγμα του ίδιου ασθενούς.')
  if (!samePatient(sample, parent)) throw new Error('Το προηγούμενο δείγμα του επανελέγχου ανήκει σε διαφορετικό ασθενή.')
  return parent
}

function existingInfectionForSample(sampleId) {
  return loadInfections().find((item) => String(item.relatedSample || item.initialSampleId || '') === String(sampleId)) || null
}

function buildCaseBase(sample, existing = {}) {
  return {
    ...existing,
    patientKey: String(sample.patientId || sample.patientCode || existing.patientKey || ''),
    patientName: sample.patientName || sample.subjectName || existing.patientName || '',
    department: sample.department || existing.department || '',
    startDate: existing.startDate || sample.collectionDate || new Date().toISOString().slice(0, 10),
    reason: existing.reason || 'Εργαστηριακή διερεύνηση',
    initialSampleId: existing.initialSampleId || sample.id || '',
    origin: existing.origin || 'Εργαστήριο',
  }
}

function ensureCaseForPositiveInitialSample(sample) {
  if (sample.clinicalCaseId) {
    const existing = getSurveillanceCase(sample.clinicalCaseId)
    if (existing) return activateCaseFromPositiveSample(existing.id, sample, buildCaseBase(sample, existing))
  }

  const existingByInitialSample = loadPatientSamples()
    .filter((item) => String(item.id) === String(sample.id))
    .map((item) => item.clinicalCaseId)
    .filter(Boolean)
    .map(getSurveillanceCase)
    .find(Boolean)
  if (existingByInitialSample) return activateCaseFromPositiveSample(existingByInitialSample.id, sample, buildCaseBase(sample, existingByInitialSample))

  const created = upsertSurveillanceCase({
    ...buildCaseBase(sample),
    id: `CASE-${Date.now()}`,
    status: SURVEILLANCE_CASE_STATUS.ACTIVE,
    workflowPhase: 'confirmed-positive',
    laboratoryOutcome: 'positive',
    confirmingSampleId: sample.id,
    confirmationDate: sample.resultDate || sample.collectionDate || '',
    autoCreatedFromLaboratory: true,
  })
  return created
}

function syncExistingPatientCase(sample) {
  if (!sample.clinicalCaseId) return null
  const current = getSurveillanceCase(sample.clinicalCaseId)
  if (!current) return null

  const patch = buildCaseBase(sample, current)
  if (sample.status === 'Θετικό') return activateCaseFromPositiveSample(current.id, sample, patch)
  if (sample.status === 'Αρνητικό') return closeCaseFromNegativeSample(current.id, sample, patch)
  if (sample.status !== 'Θετικό' && sample.status !== 'Αρνητικό') {
    // A pending recheck must not downgrade an already confirmed active case to
    // "Αναμονή εργαστηρίου". The surveillance remains active while the new
    // laboratory result is pending.
    if (isPatientSampleRecheck(sample) && current.status === SURVEILLANCE_CASE_STATUS.ACTIVE) {
      return upsertSurveillanceCase({
        ...current,
        ...patch,
        status: SURVEILLANCE_CASE_STATUS.ACTIVE,
        workflowPhase: 'recheck-pending',
        laboratoryOutcome: 'pending',
        closedDate: '',
      })
    }
    return markCaseAwaitingLaboratory(current.id, patch)
  }
  return current
}

/**
 * Single patient-sample workflow boundary used by both Patient and Laboratory UI.
 *
 * Supported entry paths:
 * 1) Patient -> surveillance -> sample -> laboratory result
 *    - pending: surveillance waits for laboratory
 *    - negative initial sample: surveillance closes, history is preserved
 *    - positive initial sample: same surveillance continues as confirmed/active
 * 2) Laboratory -> patient sample
 *    - pending/negative: no surveillance case is created
 *    - positive initial sample: a surveillance case is created and the sample is linked to it
 * 3) Rechecks always stay in their existing case and never create a second case.
 */
export function savePatientSampleWithClinicalWorkflow(input = {}) {
  const allSamples = loadPatientSamples()
  const recheck = isPatientSampleRecheck(input)
  const parent = ensureRecheckIntegrity(input, allSamples)
  const rootSampleId = recheck
    ? (parent?.rootSampleId || parent?.id || input.rootSampleId || '')
    : (input.rootSampleId || '')

  let sample = upsertPatientSample({
    ...input,
    isRecheck: recheck,
    category: recheck ? 'Επανέλεγχος' : (input.category || 'Αρχικό / νέο ανεξάρτητο δείγμα'),
    parentSampleId: recheck ? parent.id : '',
    rootSampleId,
    clinicalCaseId: input.clinicalCaseId || (recheck ? parent?.clinicalCaseId || '' : ''),
    clinicalWorkflowState: workflowState(input),
  })

  // A sample created from the patient folder already belongs to a surveillance case.
  // Keep that case synchronized for pending/negative/positive outcomes.
  let surveillanceCase = syncExistingPatientCase(sample)

  if (sample.status === 'Αρνητικό') {
    return {
      sample,
      surveillanceCase,
      infection: null,
      createdInfection: false,
      workflowState: sample.clinicalWorkflowState,
    }
  }

  if (sample.status !== 'Θετικό') {
    return {
      sample,
      surveillanceCase,
      infection: null,
      createdInfection: false,
      workflowState: sample.clinicalWorkflowState,
    }
  }

  if (recheck) {
    const relatedInfection = parent?.relatedInfection || parent?.infectionCaseId || sample.relatedInfection || ''
    if (relatedInfection && sample.relatedInfection !== relatedInfection) {
      sample = upsertPatientSample({ ...sample, relatedInfection, infectionCaseId: relatedInfection })
    }
    return {
      sample,
      surveillanceCase,
      infection: relatedInfection ? loadInfections().find((item) => String(item.id) === String(relatedInfection)) || null : null,
      createdInfection: false,
      workflowState: sample.clinicalWorkflowState,
    }
  }

  // Positive sample created from Laboratory: create the patient surveillance folder now.
  if (!surveillanceCase) {
    surveillanceCase = ensureCaseForPositiveInitialSample(sample)
    sample = upsertPatientSample({
      ...sample,
      clinicalCaseId: surveillanceCase.id,
    })
  }

  const existing = existingInfectionForSample(sample.id)
  const infectionId = existing?.id || sample.relatedInfection || `INF-${Date.now()}`
  const infection = upsertInfection({
    ...existing,
    id: infectionId,
    patientId: sample.patientId || existing?.patientId || '',
    patientName: sample.patientName || sample.subjectName || existing?.patientName || '',
    patientCode: sample.patientCode || sample.subjectCode || existing?.patientCode || '',
    department: sample.department || existing?.department || '',
    admissionDate: sample.admissionDate || existing?.admissionDate || '',
    infectionDate: sample.collectionDate || sample.resultDate || existing?.infectionDate || '',
    onsetDate: sample.collectionDate || sample.resultDate || existing?.onsetDate || '',
    infectionType: existing?.infectionType || 'Υπό κλινική αξιολόγηση',
    status: existing?.status || 'Υπό διερεύνηση',
    origin: sample.clinicalCaseId ? 'Θετικό αποτέλεσμα συνδεδεμένης επιτήρησης' : 'Αυτόματα από θετικό εργαστηριακό αποτέλεσμα',
    verificationStatus: 'Εργαστηριακά επιβεβαιωμένο εύρημα',
    microorganism: overallMicroorganism(sample) || existing?.microorganism || '',
    resistance: sample.resistance || existing?.resistance || '',
    relatedSample: sample.id,
    initialSampleId: sample.id,
    clinicalCaseId: surveillanceCase?.id || sample.clinicalCaseId || existing?.clinicalCaseId || '',
    autoCreatedFromLaboratory: !input.clinicalCaseId,
    updatedAt: new Date().toISOString(),
  })

  sample = upsertPatientSample({
    ...sample,
    clinicalCaseId: surveillanceCase?.id || sample.clinicalCaseId || '',
    relatedInfection: infection.id,
    infectionCaseId: infection.id,
    createInfection: true,
    requiresInfectionReview: true,
  })

  return {
    sample,
    surveillanceCase,
    infection,
    createdInfection: !existing,
    workflowState: sample.clinicalWorkflowState,
  }
}
