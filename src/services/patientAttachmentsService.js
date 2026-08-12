import { APP_EVENTS, emitAppEvent } from '../core/events'
import { clinicalSupportRepository } from '../repositories/clinicalSupportRepository'
export const PATIENT_ATTACHMENTS_EVENT = APP_EVENTS.PATIENT_ATTACHMENTS_UPDATED
export const loadPatientAttachments=()=>clinicalSupportRepository.loadPatientAttachments()
function save(rows){const next=clinicalSupportRepository.savePatientAttachments(rows);emitAppEvent(PATIENT_ATTACHMENTS_EVENT,next);return next}
export function getPatientAttachments(patient){const key=String(patient?.id||patient?.patientCode||'');return loadPatientAttachments().filter((item)=>String(item.patientKey)===key)}
export function addPatientAttachment(record={}){const next={...record,id:`ATT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString()};save([next,...loadPatientAttachments()]);return next}
export function deletePatientAttachment(id){return save(loadPatientAttachments().filter((item)=>item.id!==id))}
