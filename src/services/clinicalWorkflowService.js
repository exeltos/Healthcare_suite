import { loadInfections, upsertInfection } from './infectionsService'
import { IS_PRODUCTION } from '../core/runtime'
import { deleteClinicalInfection, deleteClinicalPatientSample, deleteClinicalSurveillanceCase, hydrateClinicalPatient, loadClinicalInfections, loadClinicalSurveillanceCases, saveClinicalInfection, saveClinicalPatientSample, saveClinicalSurveillanceCase } from './backend/clinicalDirectoryService'
import { loadClinicalIsolations, saveClinicalIsolation } from './backend/clinicalSupportBackendService'
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

function retractAutoInfectionForNonPositiveSample(sample) {
  const existing = existingInfectionForSample(sample.id)
  if (!existing) return null
  const autoLinked = existing.autoCreatedFromLaboratory || existing.verificationStatus === 'Εργαστηριακά επιβεβαιωμένο εύρημα'
  if (!autoLinked) return null
  return upsertInfection({
    ...existing,
    status: 'Ακυρωμένη',
    verificationStatus: sample.status === 'Αρνητικό' ? 'Αρνητικό εργαστηριακό αποτέλεσμα' : 'Αναμονή εργαστηριακής επιβεβαίωσης',
    cancellationReason: 'laboratory-result-revised',
    cancellationDate: sample.resultDate || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  })
}

function clearSampleInfectionLink(sample) {
  if (!sample.relatedInfection && !sample.infectionCaseId && !sample.createInfection && !sample.requiresInfectionReview) return sample
  return upsertPatientSample({
    ...sample,
    relatedInfection: '',
    infectionCaseId: '',
    createInfection: false,
    requiresInfectionReview: false,
  })
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
  if (sample.status === 'Αρνητικό') {
    // A negative follow-up is a monitoring result, not an automatic closure of
    // an already confirmed infection/surveillance episode. Closure remains a
    // clinical decision in Reassessment & Outcome.
    if (isPatientSampleRecheck(sample) && current.status === SURVEILLANCE_CASE_STATUS.ACTIVE) {
      return upsertSurveillanceCase({
        ...current,
        ...patch,
        status: SURVEILLANCE_CASE_STATUS.ACTIVE,
        workflowPhase: 'recheck-negative',
        laboratoryOutcome: 'negative-recheck',
        lastRecheckSampleId: sample.id,
        lastRecheckDate: sample.resultDate || sample.collectionDate || '',
        closedDate: '',
      })
    }
    return closeCaseFromNegativeSample(current.id, sample, patch)
  }
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
    if (current.autoCreatedFromLaboratory) {
      const closeDate = sample.resultDate || new Date().toISOString().slice(0, 10)
      return upsertSurveillanceCase({
        ...current,
        ...patch,
        status: SURVEILLANCE_CASE_STATUS.CLOSED,
        workflowPhase: 'closed-result-revised',
        laboratoryOutcome: 'pending',
        closedDate: closeDate,
        close: {
          ...(current.close || {}),
          date: closeDate,
          result: 'Αναμονή εργαστηριακής επιβεβαίωσης',
          reason: 'laboratory-result-revised',
          notes: 'Το προηγούμενο θετικό αποτέλεσμα αναθεωρήθηκε σε εκκρεμές.',
        },
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

  if (recheck && input.clinicalCaseId && parent?.clinicalCaseId && String(input.clinicalCaseId) !== String(parent.clinicalCaseId)) {
    throw new Error('Ο επανέλεγχος πρέπει να παραμένει στην ίδια επιτήρηση με το προηγούμενο δείγμα.')
  }

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
    const retractedInfection = retractAutoInfectionForNonPositiveSample(sample)
    if (retractedInfection) sample = clearSampleInfectionLink(sample)
    return {
      sample,
      surveillanceCase,
      infection: retractedInfection,
      createdInfection: false,
      retractedInfection: Boolean(retractedInfection),
      workflowState: sample.clinicalWorkflowState,
    }
  }

  if (sample.status !== 'Θετικό') {
    const retractedInfection = retractAutoInfectionForNonPositiveSample(sample)
    if (retractedInfection) sample = clearSampleInfectionLink(sample)
    return {
      sample,
      surveillanceCase,
      infection: retractedInfection,
      createdInfection: false,
      retractedInfection: Boolean(retractedInfection),
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
    status: existing?.cancellationReason === 'laboratory-result-revised' ? 'Υπό διερεύνηση' : (existing?.status || 'Υπό διερεύνηση'),
    origin: sample.clinicalCaseId ? 'Θετικό αποτέλεσμα συνδεδεμένης επιτήρησης' : 'Αυτόματα από θετικό εργαστηριακό αποτέλεσμα',
    verificationStatus: 'Εργαστηριακά επιβεβαιωμένο εύρημα',
    cancellationReason: '',
    cancellationDate: '',
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


/**
 * Production-aware async boundary.
 * Demo mode keeps the established synchronous workflow.
 * Production mode hydrates the current clinical context from Supabase,
 * runs the same lifecycle rules, then persists the resulting entities back.
 */
export async function savePatientSampleWithClinicalWorkflowAsync(input = {}) {
  if (!IS_PRODUCTION) return savePatientSampleWithClinicalWorkflow(input)

  const patientKey=input.patientId||input.patientCode
  if(patientKey) await hydrateClinicalPatient(patientKey)

  const result=savePatientSampleWithClinicalWorkflow(input)

  // Persist the sample first. For a brand-new initial sample the case may already
  // contain its generated id in local state, but the FK target does not exist yet.
  // saveClinicalPatientSample also performs the authoritative case->initial_sample_id
  // link after the sample has been written and verified.
  if(result?.sample) await saveClinicalPatientSample(result.sample)

  if(result?.surveillanceCase) {
    // Reload after the sample write so the case carries the authoritative
    // initial_sample_id that saveClinicalPatientSample may have just linked.
    const patientId=result?.sample?.patientId||result?.surveillanceCase?.patientId||result?.surveillanceCase?.patientKey
    const persistedCases=patientId?await loadClinicalSurveillanceCases(patientId):[]
    const persistedCase=persistedCases.find((item)=>String(item.id)===String(result.surveillanceCase.id))
    await saveClinicalSurveillanceCase(persistedCase||{
      ...result.surveillanceCase,
      initialSampleId:'',
    })
  }
  if(result?.infection) await saveClinicalInfection(result.infection)

  return result
}


export async function closeClinicalSurveillanceEpisode({ surveillanceCase, patient, review = {}, close = {} } = {}) {
  if (!surveillanceCase?.id) throw new Error('Δεν υπάρχει ενεργή επιτήρηση για κλείσιμο.')
  const closeDate = close.date || review.date || new Date().toISOString().slice(0, 10)
  const result = close.result || review.outcome || ''
  if (!closeDate || !result) throw new Error('Συμπληρώστε ημερομηνία και έκβαση πριν από το κλείσιμο.')

  const closedCase = await saveClinicalSurveillanceCase({
    ...surveillanceCase,
    review: { ...(surveillanceCase.review || {}), ...review, date: review.date || closeDate },
    close: { ...(surveillanceCase.close || {}), ...close, date: closeDate, result },
    status: SURVEILLANCE_CASE_STATUS.CLOSED,
    workflowPhase: 'closed-clinical-outcome',
    closedDate: closeDate,
  })

  const patientId = patient?.id || surveillanceCase.patientId || surveillanceCase.patientKey
  if (patientId) {
    const [infectionRows, isolationRows] = await Promise.all([
      loadClinicalInfections(patientId),
      loadClinicalIsolations(patientId),
    ])

    for (const infection of infectionRows.filter((item) => String(item.clinicalCaseId || '') === String(surveillanceCase.id) && item.status !== 'Ολοκληρωμένη')) {
      await saveClinicalInfection({
        ...infection,
        status: 'Ολοκληρωμένη',
        completedDate: closeDate,
        outcome: result,
        closureReason: 'clinical-surveillance-closure',
      })
    }

    for (const isolation of isolationRows.filter((item) => String(item.clinicalCaseId || '') === String(surveillanceCase.id) && item.status === 'Ενεργή')) {
      await saveClinicalIsolation({
        ...isolation,
        status: 'Ολοκληρωμένη',
        endDate: isolation.endDate || closeDate,
        closureReason: 'clinical-surveillance-closure',
      })
    }
  }

  return closedCase
}


export async function deletePatientSampleWithClinicalWorkflowAsync(sampleOrId) {
  const sampleId = typeof sampleOrId === 'object' ? sampleOrId?.id : sampleOrId
  if (!sampleId) return false

  let sample = typeof sampleOrId === 'object'
    ? sampleOrId
    : loadPatientSamples().find((item) => String(item.id) === String(sampleId))

  if (IS_PRODUCTION && sample?.patientId) {
    await hydrateClinicalPatient(sample.patientId)
    sample = loadPatientSamples().find((item) => String(item.id) === String(sampleId)) || sample
  }
  if (!sample) {
    await deleteClinicalPatientSample(sampleId)
    return true
  }

  const linkedInfection = existingInfectionForSample(sample.id)
  const linkedCase = sample.clinicalCaseId ? getSurveillanceCase(sample.clinicalCaseId) : null
  const remainingCaseSamples = loadPatientSamples().filter((item) =>
    String(item.id) !== String(sample.id) &&
    sample.clinicalCaseId &&
    String(item.clinicalCaseId || '') === String(sample.clinicalCaseId)
  )
  const linkedIsolations = sample.patientId && sample.clinicalCaseId
    ? (await loadClinicalIsolations(sample.patientId)).filter((item) => String(item.clinicalCaseId || '') === String(sample.clinicalCaseId))
    : []

  await deleteClinicalPatientSample(sample.id)

  if (linkedInfection && (linkedInfection.autoCreatedFromLaboratory || linkedInfection.verificationStatus === 'Εργαστηριακά επιβεβαιωμένο εύρημα')) {
    await deleteClinicalInfection(linkedInfection.id)
  }

  if (linkedCase?.autoCreatedFromLaboratory && remainingCaseSamples.length === 0) {
    const hasClinicalContent = Boolean(
      (Array.isArray(linkedCase.therapies) && linkedCase.therapies.length) ||
      linkedCase.therapy?.antibiotic ||
      linkedCase.assessment?.classification ||
      linkedCase.assessment?.infectionSite ||
      linkedCase.questionnaire?.completed ||
      linkedCase.questionnaire?.notes ||
      linkedCase.review?.outcome ||
      linkedIsolations.length
    )
    if (hasClinicalContent) {
      await saveClinicalSurveillanceCase({
        ...linkedCase,
        status: SURVEILLANCE_CASE_STATUS.AWAITING_LAB,
        workflowPhase: 'awaiting-laboratory',
        laboratoryOutcome: 'pending',
        initialSampleId: '',
        confirmingSampleId: '',
        confirmationDate: '',
        closedDate: '',
        close: {},
        sourceSampleDeletedAt: new Date().toISOString(),
      })
    } else {
      await deleteClinicalSurveillanceCase(linkedCase.id)
    }
  }

  return true
}
