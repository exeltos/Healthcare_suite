import { APP_EVENTS, emitAppEvent } from '../core/events'
import { patientsMock } from '../data/patientsMock'
import { loadMasterData, saveMasterData } from './masterDataService'
import { patientRepository } from '../repositories/patientRepository'

export const PATIENT_REGISTRY_EVENT = APP_EVENTS.PATIENT_REGISTRY_UPDATED
export const PATIENT_CONFIG_EVENT = APP_EVENTS.PATIENT_CONFIG_UPDATED

const DEFAULT_CONFIG = Object.freeze({
  sourceMode: 'Υβριδική',
  allowManualCreation: true,
  useSettingsLibrary: true,
})

export function normalizePatientRecord(record = {}) {
  const raw = String(record.fullName || '').trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  const firstName = String(record.firstName || parts[0] || '').trim()
  const lastName = String(record.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : '')).trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || raw
  return {
    ...record,
    firstName,
    lastName,
    fatherName: record.fatherName || '',
    gender: record.gender || '',
    age: record.age ?? '',
    admissionDate: record.admissionDate || '',
    admissionTime: record.admissionTime || '',
    dischargeDate: record.dischargeDate || record.exitDate || '',
    dischargeTime: record.dischargeTime || '',
    fullName,
  }
}

function patientKeys(record = {}) {
  return [record.id, record.patientCode].filter(Boolean).map(String)
}

function masterPatients() {
  const masterData = loadMasterData()
  return Array.isArray(masterData['patients-library']) ? masterData['patients-library'] : []
}

function syncPatientToMasterLibrary(record) {
  const masterData = loadMasterData()
  const rows = Array.isArray(masterData['patients-library']) ? masterData['patients-library'] : []
  const index = rows.findIndex((item) =>
    (item.id && record.id && String(item.id) === String(record.id)) ||
    (item.patientCode && record.patientCode && String(item.patientCode) === String(record.patientCode))
  )
  const nextRows = index >= 0
    ? rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...record } : item)
    : [{ ...record }, ...rows]
  saveMasterData({ ...masterData, 'patients-library': nextRows })
}

export function loadPatientSourceConfig() {
  return { ...DEFAULT_CONFIG, ...patientRepository.loadConfig() }
}

export function savePatientSourceConfig(config = {}) {
  const nextConfig = { ...DEFAULT_CONFIG, ...config }
  patientRepository.saveConfig(nextConfig)
  emitAppEvent(PATIENT_CONFIG_EVENT, nextConfig)
  return nextConfig
}

export function loadPatientRegistry() {
  const config = loadPatientSourceConfig()
  const savedRegistry = patientRepository.findSaved()
  const libraryRecords = masterPatients()
  const deleted = new Set(patientRepository.findDeletedKeys().map(String))
  const combined = []

  function addUnique(record) {
    if (!record) return
    if (patientKeys(record).some((key) => deleted.has(key))) return
    const exists = combined.some((item) =>
      (item.id && record.id && String(item.id) === String(record.id)) ||
      (item.patientCode && record.patientCode && String(item.patientCode) === String(record.patientCode))
    )
    if (!exists) combined.push(normalizePatientRecord(record))
  }

  if (config.sourceMode === 'Βιβλιοθήκη Ρυθμίσεων' || config.sourceMode === 'Υβριδική') libraryRecords.forEach(addUnique)
  if (config.sourceMode === 'Προσωρινή Demo Λίστα' || config.sourceMode === 'Υβριδική') patientsMock.forEach(addUnique)
  if (config.sourceMode === 'Χειροκίνητη Καταχώρηση' || config.sourceMode === 'Υβριδική') savedRegistry.forEach(addUnique)
  return combined
}

export function savePatientRegistry(records = []) {
  const next = Array.isArray(records) ? records : []
  patientRepository.replaceSaved(next)
  emitAppEvent(PATIENT_REGISTRY_EVENT, next)
  return next
}

export function upsertPatient(record = {}) {
  const savedRegistry = patientRepository.findSaved()
  const normalized = normalizePatientRecord({
    status: 'Νοσηλεύεται',
    positiveCulture: false,
    mdr: false,
    isolation: false,
    ...record,
    id: record.id || `patient-${Date.now()}`,
  })

  const restoredKeys = new Set(patientKeys(normalized))
  patientRepository.replaceDeletedKeys(
    patientRepository.findDeletedKeys().filter((key) => !restoredKeys.has(String(key)))
  )

  const index = savedRegistry.findIndex((item) =>
    String(item.id) === String(normalized.id) ||
    (item.patientCode && normalized.patientCode && String(item.patientCode) === String(normalized.patientCode))
  )
  const nextRecords = index >= 0
    ? savedRegistry.map((item, itemIndex) => itemIndex === index ? normalized : item)
    : [normalized, ...savedRegistry]

  savePatientRegistry(nextRecords)
  syncPatientToMasterLibrary(normalized)
  return normalized
}

export function deletePatient(recordOrId) {
  const record = typeof recordOrId === 'object' && recordOrId !== null ? recordOrId : { id: recordOrId }
  const keys = new Set(patientKeys(record))
  const nextRegistry = patientRepository.findSaved().filter((item) => !patientKeys(item).some((key) => keys.has(key)))
  patientRepository.replaceSaved(nextRegistry)
  patientRepository.replaceDeletedKeys([...patientRepository.findDeletedKeys(), ...keys])

  const masterData = loadMasterData()
  const library = Array.isArray(masterData['patients-library']) ? masterData['patients-library'] : []
  saveMasterData({
    ...masterData,
    'patients-library': library.filter((item) => !patientKeys(item).some((key) => keys.has(key))),
  })
  emitAppEvent(PATIENT_REGISTRY_EVENT, nextRegistry)
  return nextRegistry
}
