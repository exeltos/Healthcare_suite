import { readJsonArray, readJsonObject, writeJson } from '../core/storage'

export const PATIENT_STORAGE_KEYS = Object.freeze({
  registry: 'limoxisPatientRegistry',
  config: 'limoxisPatientSourceConfig',
  deleted: 'limoxisDeletedPatients',
})

export const patientRepository = Object.freeze({
  findSaved() {
    return readJsonArray(PATIENT_STORAGE_KEYS.registry, [])
  },
  replaceSaved(records = []) {
    return writeJson(PATIENT_STORAGE_KEYS.registry, Array.isArray(records) ? records : [])
  },
  loadConfig() {
    return readJsonObject(PATIENT_STORAGE_KEYS.config, {})
  },
  saveConfig(config = {}) {
    return writeJson(PATIENT_STORAGE_KEYS.config, config)
  },
  findDeletedKeys() {
    return readJsonArray(PATIENT_STORAGE_KEYS.deleted, [])
  },
  replaceDeletedKeys(keys = []) {
    return writeJson(PATIENT_STORAGE_KEYS.deleted, [...new Set((Array.isArray(keys) ? keys : []).map(String))])
  },
})
