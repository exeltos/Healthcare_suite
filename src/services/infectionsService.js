import { APP_EVENTS, emitAppEvent } from '../core/events'
import { infectionsRepository, INFECTIONS_EVENT } from '../repositories/infectionsRepository'

export { INFECTIONS_EVENT }
export const INFECTION_SAVED_EVENT = APP_EVENTS.INFECTION_SAVED

export function loadInfections() { return infectionsRepository.findAll() }
export function replaceInfections(rows, options = {}) { return infectionsRepository.replaceAll(rows, options) }
export function deleteInfection(id) { return infectionsRepository.remove(id) }

export function saveInfection(input, previous = null) {
  const attachmentInfo = input.attachment
    ? { name: input.attachment.name, size: input.attachment.size, type: input.attachment.type }
    : previous?.attachmentInfo || null
  const record = infectionsRepository.save({
    ...input,
    id: previous?.id || input.id,
    attachment: undefined,
    attachmentInfo,
    updatedAt: new Date().toISOString(),
  })
  emitAppEvent(INFECTION_SAVED_EVENT, record)
  return record
}

export function getInfectionStats(records = []) {
  return {
    total: records.length,
    active: records.filter((r) => r.status === 'Ενεργή').length,
    investigating: records.filter((r) => r.status === 'Υπό διερεύνηση').length,
    resistant: records.filter((r) => ['MDR','XDR','PDR','CRE','MRSA','VRE','ESBL'].includes(r.resistance)).length,
  }
}

export function upsertInfection(record) { return infectionsRepository.save(record) }
export function getPatientInfections(patient) {
  if (!patient) return []
  return infectionsRepository.findAll().filter((record) => {
    const sameCode = record.patientCode && patient.patientCode && String(record.patientCode) === String(patient.patientCode)
    const sameName = record.patientName && patient.fullName && String(record.patientName).trim().toLocaleLowerCase('el-GR') === String(patient.fullName).trim().toLocaleLowerCase('el-GR')
    return sameCode || sameName
  })
}
