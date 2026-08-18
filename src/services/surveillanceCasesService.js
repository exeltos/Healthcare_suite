import { APP_EVENTS, emitAppEvent } from '../core/events'
import { clinicalSupportRepository } from '../repositories/clinicalSupportRepository'
import { loadPatientSamples } from './patientSamplesService'

export const SURVEILLANCE_CASES_EVENT = APP_EVENTS.SURVEILLANCE_CASES_UPDATED

export const SURVEILLANCE_CASE_STATUS = Object.freeze({
  AWAITING_LAB: 'Αναμονή εργαστηρίου',
  ACTIVE: 'Ενεργό',
  CLOSED: 'Κλειστό',
})

const patientKey = (patient) => String(patient?.id || patient?.patientCode || '')

export function loadSurveillanceCases() {
  return clinicalSupportRepository.loadSurveillanceCases()
}

function save(rows) {
  const next = clinicalSupportRepository.saveSurveillanceCases(rows)
  emitAppEvent(SURVEILLANCE_CASES_EVENT, next)
  return next
}

export function replaceSurveillanceCases(rows = []) {
  return save(Array.isArray(rows) ? rows : [])
}

function sampleIsRecheck(sample = {}) {
  return Boolean(sample.isRecheck || sample.parentSampleId || sample.category === 'Επανέλεγχος')
}

function sampleTimestamp(sample = {}) {
  const date = sample.resultDate || sample.collectionDate || ''
  const time = sample.collectionTime || ''
  const parsed = Date.parse(`${date}${time ? `T${time}` : ''}`)
  return Number.isNaN(parsed) ? 0 : parsed
}

function reconcileCaseFromSamples(caseRecord, samples = []) {
  if (!caseRecord) return caseRecord
  const linked = samples
    .filter((sample) => String(sample.clinicalCaseId || '') === String(caseRecord.id))
    .sort((a, b) => sampleTimestamp(a) - sampleTimestamp(b))
  if (!linked.length) return caseRecord

  // Never overwrite a case that was explicitly closed for another reason.
  if (caseRecord.status === SURVEILLANCE_CASE_STATUS.CLOSED && caseRecord.close?.reason && !['negative-recheck', 'negative-initial'].includes(caseRecord.close.reason)) {
    return caseRecord
  }

  const negativeRechecks = linked.filter((sample) => sampleIsRecheck(sample) && sample.status === 'Αρνητικό')
  if (negativeRechecks.length) {
    const closingSample = negativeRechecks[negativeRechecks.length - 1]
    const closeDate = closingSample.resultDate || closingSample.collectionDate || caseRecord.closedDate || new Date().toISOString().slice(0, 10)
    return {
      ...caseRecord,
      status: SURVEILLANCE_CASE_STATUS.CLOSED,
      workflowPhase: 'closed-negative-recheck',
      laboratoryOutcome: 'negative',
      negativeClosingSampleId: closingSample.id,
      closedDate: closeDate,
      close: {
        ...(caseRecord.close || {}),
        date: closeDate,
        triggerSampleId: closingSample.id,
        reason: 'negative-recheck',
        result: 'Αρνητικοποίηση — αρνητικός επανέλεγχος',
      },
    }
  }

  const initialNegative = linked.find((sample) => !sampleIsRecheck(sample) && sample.status === 'Αρνητικό')
  const positive = [...linked].reverse().find((sample) => sample.status === 'Θετικό')
  if (positive) {
    return {
      ...caseRecord,
      status: SURVEILLANCE_CASE_STATUS.ACTIVE,
      workflowPhase: linked.some((sample) => sampleIsRecheck(sample) && sample.status === 'Εκκρεμεί') ? 'recheck-pending' : 'confirmed-positive',
      laboratoryOutcome: linked.some((sample) => sampleIsRecheck(sample) && sample.status === 'Εκκρεμεί') ? 'pending' : 'positive',
      confirmingSampleId: caseRecord.confirmingSampleId || positive.id,
      confirmationDate: caseRecord.confirmationDate || positive.resultDate || positive.collectionDate || '',
      closedDate: '',
    }
  }

  if (initialNegative) {
    const closeDate = initialNegative.resultDate || initialNegative.collectionDate || caseRecord.closedDate || new Date().toISOString().slice(0, 10)
    return {
      ...caseRecord,
      status: SURVEILLANCE_CASE_STATUS.CLOSED,
      workflowPhase: 'closed-negative',
      laboratoryOutcome: 'negative',
      negativeClosingSampleId: initialNegative.id,
      closedDate: closeDate,
      close: {
        ...(caseRecord.close || {}),
        date: closeDate,
        triggerSampleId: initialNegative.id,
        reason: 'negative-initial',
        result: 'Μη επιβεβαιωμένη λοίμωξη — αρνητικό αρχικό εργαστηριακό αποτέλεσμα',
      },
    }
  }

  return {
    ...caseRecord,
    status: SURVEILLANCE_CASE_STATUS.AWAITING_LAB,
    workflowPhase: 'awaiting-laboratory',
    laboratoryOutcome: 'pending',
    closedDate: '',
  }
}

function sameCaseLifecycle(left = {}, right = {}) {
  return JSON.stringify({
    status: left.status,
    workflowPhase: left.workflowPhase,
    laboratoryOutcome: left.laboratoryOutcome,
    negativeClosingSampleId: left.negativeClosingSampleId || '',
    closedDate: left.closedDate || '',
    close: left.close || {},
    confirmingSampleId: left.confirmingSampleId || '',
    confirmationDate: left.confirmationDate || '',
  }) === JSON.stringify({
    status: right.status,
    workflowPhase: right.workflowPhase,
    laboratoryOutcome: right.laboratoryOutcome,
    negativeClosingSampleId: right.negativeClosingSampleId || '',
    closedDate: right.closedDate || '',
    close: right.close || {},
    confirmingSampleId: right.confirmingSampleId || '',
    confirmationDate: right.confirmationDate || '',
  })
}

export function getPatientCases(patient) {
  const key = patientKey(patient)
  const allCases = loadSurveillanceCases()
  const allSamples = loadPatientSamples()
  let changed = false
  const reconciled = allCases.map((item) => {
    if (String(item.patientKey) !== key) return item
    const next = reconcileCaseFromSamples(item, allSamples)
    if (!sameCaseLifecycle(item, next)) changed = true
    return next
  })
  if (changed) save(reconciled)
  return reconciled.filter((item) => String(item.patientKey) === key)
}

export function getSurveillanceCase(id) {
  if (!id) return null
  return loadSurveillanceCases().find((item) => String(item.id) === String(id)) || null
}

export function upsertSurveillanceCase(record = {}) {
  const rows = loadSurveillanceCases()
  const now = new Date().toISOString()
  const next = {
    ...record,
    id: record.id || `CASE-${Date.now()}`,
    updatedAt: now,
    createdAt: record.createdAt || now,
  }
  const index = rows.findIndex((item) => item.id === next.id)
  save(index >= 0 ? rows.map((item, i) => i === index ? next : item) : [next, ...rows])
  return next
}

export function deleteSurveillanceCase(id) {
  return save(loadSurveillanceCases().filter((item) => item.id !== id))
}

/**
 * Keeps the surveillance folder lifecycle in one service boundary.
 * UI pages and laboratory pages must not implement their own status rules.
 */
export function markCaseAwaitingLaboratory(caseId, patch = {}) {
  const current = getSurveillanceCase(caseId)
  if (!current) return null
  return upsertSurveillanceCase({
    ...current,
    ...patch,
    status: SURVEILLANCE_CASE_STATUS.AWAITING_LAB,
    workflowPhase: 'awaiting-laboratory',
    laboratoryOutcome: 'pending',
    closedDate: '',
  })
}

export function activateCaseFromPositiveSample(caseId, sample, patch = {}) {
  const current = getSurveillanceCase(caseId)
  if (!current) return null
  const previousClosure = current.close?.date ? { ...current.close } : null
  return upsertSurveillanceCase({
    ...current,
    ...patch,
    status: SURVEILLANCE_CASE_STATUS.ACTIVE,
    workflowPhase: 'confirmed-positive',
    laboratoryOutcome: 'positive',
    initialSampleId: current.initialSampleId || sample?.id || '',
    confirmingSampleId: sample?.id || current.confirmingSampleId || '',
    confirmationDate: sample?.resultDate || sample?.collectionDate || current.confirmationDate || '',
    closedDate: '',
    close: {},
    closureHistory: previousClosure
      ? [...(Array.isArray(current.closureHistory) ? current.closureHistory : []), previousClosure]
      : (current.closureHistory || []),
    reopenedAt: previousClosure ? new Date().toISOString() : (current.reopenedAt || ''),
  })
}

export function closeCaseFromNegativeSample(caseId, sample, patch = {}) {
  const current = getSurveillanceCase(caseId)
  if (!current) return null
  const isRecheck = Boolean(sample?.isRecheck || sample?.parentSampleId || sample?.category === 'Επανέλεγχος')
  const closeDate = sample?.resultDate || new Date().toISOString().slice(0, 10)
  return upsertSurveillanceCase({
    ...current,
    ...patch,
    status: SURVEILLANCE_CASE_STATUS.CLOSED,
    workflowPhase: 'closed-negative',
    laboratoryOutcome: 'negative',
    initialSampleId: current.initialSampleId || sample?.id || '',
    negativeClosingSampleId: sample?.id || '',
    closedDate: closeDate,
    close: {
      ...(current.close || {}),
      date: closeDate,
      triggerSampleId: sample?.id || '',
      reason: isRecheck ? 'negative-recheck' : 'negative-initial',
      result: isRecheck
        ? 'Αρνητικοποίηση — αρνητικός επανέλεγχος'
        : 'Μη επιβεβαιωμένη λοίμωξη — αρνητικό αρχικό εργαστηριακό αποτέλεσμα',
      notes: current.close?.notes || '',
    },
  })
}

export function updateTherapyApproval(caseId, therapyId, approvalPatch = {}) {
  const rows = loadSurveillanceCases()
  const caseIndex = rows.findIndex((item) => String(item.id) === String(caseId))
  if (caseIndex < 0) return null
  const current = rows[caseIndex]
  let updatedTherapy = null
  const nextTherapies = (Array.isArray(current.therapies) ? current.therapies : []).map((therapy) => {
    if (String(therapy.id) !== String(therapyId)) return therapy
    updatedTherapy = {
      ...therapy,
      approval: approvalPatch.approval ?? therapy.approval ?? 'Εκκρεμεί',
      approvalDoctor: approvalPatch.approvalDoctor ?? therapy.approvalDoctor ?? '',
      approvalDate: approvalPatch.approvalDate ?? therapy.approvalDate ?? '',
      approvalNotes: approvalPatch.approvalNotes ?? therapy.approvalNotes ?? '',
    }
    return updatedTherapy
  })
  if (!updatedTherapy) return null
  const nextRows = rows.map((item, index) => index === caseIndex ? {
    ...current,
    therapies: nextTherapies,
    therapy: nextTherapies[0] || {},
    updatedAt: new Date().toISOString(),
  } : item)
  save(nextRows)
  return updatedTherapy
}
