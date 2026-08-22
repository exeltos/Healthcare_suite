import { IS_PRODUCTION } from '../core/runtime'
import { APP_EVENTS, emitAppEvent } from '../core/events'
import { patientSamplesRepository } from '../repositories/patientSamplesRepository'

export const PATIENT_SAMPLES_EVENT = APP_EVENTS.PATIENT_SAMPLES_UPDATED

export function normalizePatientSample(record = {}) {
  return {
    sampleReason: 'Καλλιέργεια', category: 'Αρχικό / νέο ανεξάρτητο δείγμα', isRecheck: false, parentSampleId: '', rootSampleId: '', repeatPurpose: '', repeatIndex: 0, monitoringFor: [], clinicalWorkflowState: 'pending-laboratory', infectionCaseId: '', collectionTime: '', collector: '', receivedDate: '', status: 'Εκκρεμεί', microorganism: '', resistance: '', resultDate: '', resultNotes: '', relatedInfection: '', relatedIsolation: '', requiresIsolation: false, requiresInfectionReview: false, createInfection: false, createIsolation: false, notes: '', attachmentInfo: null, antibiogram: [],
    ...record,
    id: record.id?.startsWith('LAB-') ? `PS-${record.id.slice(4)}` : record.id || `PS-${Date.now()}`,
    antibiogram: Array.isArray(record.antibiogram) ? record.antibiogram : [],
  }
}

function sameSample(left, right) {
  if (left.id && right.id && left.id === right.id) return true
  return String(left.patientCode || '') === String(right.patientCode || '') && String(left.sampleType || '') === String(right.sampleType || '') && String(left.collectionDate || '') === String(right.collectionDate || '')
}

function mergeLegacyLabRecords(samples) {
  const merged = [...samples]
  patientSamplesRepository.findLegacyLaboratoryRecords().forEach((legacyRecord) => {
    const normalizedLegacy = normalizePatientSample(legacyRecord)
    const existingIndex = merged.findIndex((sample) => sameSample(sample, normalizedLegacy))
    if (existingIndex >= 0) merged[existingIndex] = normalizePatientSample({ ...merged[existingIndex], ...normalizedLegacy, id: merged[existingIndex].id })
    else merged.push(normalizedLegacy)
  })
  return merged
}

export function loadPatientSamples() {
  const storedSamples = patientSamplesRepository.findAll()
  const baseSamples = storedSamples.length > 0 ? storedSamples.map(normalizePatientSample) : []
  const mergedSamples = mergeLegacyLabRecords(baseSamples)
  // Reads must stay side-effect free in Production. Supabase backend services
  // are responsible for verified cache mirroring after authoritative reads/writes.
  if (!IS_PRODUCTION) patientSamplesRepository.replaceAll(mergedSamples)
  return mergedSamples
}

export function savePatientSamples(records = [], { emit = true } = {}) {
  const normalizedRecords = (Array.isArray(records) ? records : []).map(normalizePatientSample)
  patientSamplesRepository.replaceAll(normalizedRecords)
  if (emit) emitAppEvent(PATIENT_SAMPLES_EVENT, normalizedRecords)
  return normalizedRecords
}

export function upsertPatientSample(record = {}) {
  const records = loadPatientSamples()
  const normalizedRecord = normalizePatientSample(record)
  const existingIndex = records.findIndex((item) => item.id === normalizedRecord.id)
  savePatientSamples(existingIndex >= 0 ? records.map((item, index) => index === existingIndex ? normalizedRecord : item) : [normalizedRecord, ...records])
  return normalizedRecord
}

export function deletePatientSample(recordId) {
  return savePatientSamples(loadPatientSamples().filter((record) => record.id !== recordId))
}

export function getPatientSamples(patient) {
  if (!patient) return []
  return loadPatientSamples().filter((record) => {
    const sameCode = record.patientCode && patient.patientCode && String(record.patientCode) === String(patient.patientCode)
    const sameName = record.patientName && patient.fullName && String(record.patientName).trim().toLocaleLowerCase('el-GR') === String(patient.fullName).trim().toLocaleLowerCase('el-GR')
    return sameCode || sameName
  })
}
