import { APP_EVENTS, emitAppEvent } from '../core/events'
import { formsRepository } from '../repositories/formsRepository'

export const FORM_RESPONSES_EVENT = APP_EVENTS.FORM_RESPONSES_UPDATED
export function loadFormResponses() { return formsRepository.findResponses() }
export function saveFormResponses(records = []) { const rows=Array.isArray(records)?records:[]; formsRepository.replaceResponses(rows); emitAppEvent(FORM_RESPONSES_EVENT, rows); return rows }
export function upsertFormResponse(record = {}) { const now=new Date().toISOString(); const normalized={...record,id:record.id||`RSP-${Date.now()}`,createdAt:record.createdAt||now,updatedAt:now}; const rows=loadFormResponses(); const exists=rows.some((item)=>item.id===normalized.id); saveFormResponses(exists?rows.map((item)=>item.id===normalized.id?normalized:item):[normalized,...rows]); return normalized }
export function deleteFormResponse(responseId) { return saveFormResponses(loadFormResponses().filter((item)=>item.id!==responseId)) }
export function calculateCompliance(template, answers) { if(!template?.scoring?.enabled)return null; const scoredQuestions=(template.questions||[]).filter((question)=>question.scored); let eligible=0,score=0; scoredQuestions.forEach((question)=>{const value=answers?.[question.id]; if(value==='na'&&template.scoring.excludeNA)return; eligible+=1; if(value==='yes'||value===true||value==='compliant')score+=1}); return eligible?Math.round((score/eligible)*100):null }
