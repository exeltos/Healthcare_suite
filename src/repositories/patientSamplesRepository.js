import { readJsonArray, writeJson } from '../core/storage'

export const PATIENT_SAMPLE_STORAGE_KEYS = Object.freeze({
  samples: 'limoxisPatientSamples',
  legacyLaboratory: 'limoxisLabRecords',
})

export const patientSamplesRepository = Object.freeze({
  findAll() {
    return readJsonArray(PATIENT_SAMPLE_STORAGE_KEYS.samples, [])
  },
  replaceAll(rows = []) {
    return writeJson(PATIENT_SAMPLE_STORAGE_KEYS.samples, Array.isArray(rows) ? rows : [])
  },
  findLegacyLaboratoryRecords() {
    return readJsonArray(PATIENT_SAMPLE_STORAGE_KEYS.legacyLaboratory, [])
  },
})
