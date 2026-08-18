import { APP_EVENTS, emitAppEvent } from '../core/events'
import { isolationsRepository, ISOLATIONS_EVENT } from '../repositories/isolationsRepository'

export { ISOLATIONS_EVENT }
export const ISOLATION_SAVED_EVENT = APP_EVENTS.ISOLATION_SAVED

export function loadIsolations() { return isolationsRepository.findAll() }
export function replaceIsolations(rows) { return isolationsRepository.replaceAll(rows) }
export function deleteIsolation(id) { return isolationsRepository.remove(id) }

export function saveIsolation(input, previous = null) {
  const attachmentInfo = input.attachment
    ? { name: input.attachment.name, size: input.attachment.size, type: input.attachment.type }
    : previous?.attachmentInfo || null
  const record = isolationsRepository.save({
    ...input,
    id: previous?.id || input.id,
    attachment: undefined,
    attachmentInfo,
    updatedAt: new Date().toISOString(),
  })
  emitAppEvent(ISOLATION_SAVED_EVENT, record)
  return record
}

export function getIsolationStats(records = []) {
  return {
    total: records.length,
    active: records.filter((r) => r.status === 'Ενεργή').length,
    contact: records.filter((r) => r.isolationType === 'Επαφής').length,
    airborne: records.filter((r) => r.isolationType === 'Αερογενής').length,
  }
}

export function upsertIsolation(record) { return isolationsRepository.save(record) }
export function getPatientIsolations(patient) {
  if (!patient) return []
  return isolationsRepository.findAll().filter((record) => {
    const sameCode = record.patientCode && patient.patientCode && String(record.patientCode) === String(patient.patientCode)
    const sameName = record.patientName && patient.fullName && String(record.patientName).trim().toLocaleLowerCase('el-GR') === String(patient.fullName).trim().toLocaleLowerCase('el-GR')
    return sameCode || sameName
  })
}
