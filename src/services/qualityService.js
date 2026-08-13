import { APP_EVENTS, emitAppEvent } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import { qualityRepository } from '../repositories/qualityRepository'
export const QUALITY_EVENT = APP_EVENTS.QUALITY_UPDATED
export const AUDITS_EVENT = APP_EVENTS.QUALITY_AUDITS_UPDATED
export const loadIncidents=()=>qualityRepository.findIncidents([])
export const saveIncidents=(rows=[])=>{const next=qualityRepository.replaceIncidents(rows);emitAppEvent(QUALITY_EVENT,next);return next}
export const loadCapa=()=>qualityRepository.findCapa([])
export const saveCapa=(rows=[])=>{const next=qualityRepository.replaceCapa(rows);emitAppEvent(QUALITY_EVENT,next);return next}
export const loadAuditExecutions=()=>qualityRepository.findAudits()
export function saveAuditExecutions(rows=[]){const next=qualityRepository.replaceAudits(rows);emitAppEvent(AUDITS_EVENT,next);return next}
export function upsertAuditExecution(record={}){const now=new Date().toISOString();const normalized={...record,id:record.id||`AUD-${Date.now().toString().slice(-7)}`,createdAt:record.createdAt||now,updatedAt:now};const rows=loadAuditExecutions();const exists=rows.some((item)=>item.id===normalized.id);saveAuditExecutions(exists?rows.map((item)=>item.id===normalized.id?normalized:item):[normalized,...rows]);return normalized}
export const deleteAuditExecution=(id)=>saveAuditExecutions(loadAuditExecutions().filter((item)=>item.id!==id))
