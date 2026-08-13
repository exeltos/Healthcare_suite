import { APP_EVENTS, emitAppEvent } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import { qualityRepository } from '../repositories/qualityRepository'
export const QUALITY_EVENT = APP_EVENTS.QUALITY_UPDATED
export const AUDITS_EVENT = APP_EVENTS.QUALITY_AUDITS_UPDATED
const today=new Date().toISOString().slice(0,10)
const DEFAULT_INCIDENTS=[
 {id:'INC-001',date:today,title:'Απόκλιση διαδικασίας ταυτοποίησης',category:'Ταυτοποίηση ασθενή',department:'Παθολογική',outcome:'Χωρίς βλάβη / near miss',status:'Υπό διερεύνηση',owner:'Ομάδα Ποιότητας',description:'Διαπιστώθηκε απόκλιση στη διαδικασία ορθής ταυτοποίησης πριν από πράξη.'},
 {id:'INC-002',date:today,title:'Καθυστέρηση επικοινωνίας κρίσιμου αποτελέσματος',category:'Επικοινωνία / παράδοση φροντίδας',department:'Εργαστήριο',outcome:'Χωρίς βλάβη / near miss',status:'Νέα αναφορά',owner:'Υπεύθυνος Εργαστηρίου',description:'Καταγράφηκε καθυστέρηση στην επικοινωνία κρίσιμου εργαστηριακού αποτελέσματος.'},
]
const DEFAULT_CAPA=[
 {id:'CAPA-001',title:'Επανεκπαίδευση στην ταυτοποίηση',source:'INC-001',sourceType:'Συμβάν',actionType:'Διορθωτική',owner:'Νοσηλευτική Διεύθυνση',department:'Παθολογική',dueDate:today,priority:'Υψηλή',progress:35,status:'Σε εξέλιξη',plannedAction:'Στοχευμένη επανεκπαίδευση και επανέλεγχος συμμόρφωσης.',effectivenessStatus:'Εκκρεμεί'},
 {id:'CAPA-002',title:'Έλεγχος ροής ενημέρωσης αποτελεσμάτων',source:'INC-002',sourceType:'Συμβάν',actionType:'Βελτίωση διαδικασίας',owner:'Εργαστήριο',department:'Εργαστήριο',dueDate:today,priority:'Μέτρια',progress:70,status:'Σε εξέλιξη',plannedAction:'Ανασχεδιασμός ροής ειδοποίησης κρίσιμων αποτελεσμάτων.',effectivenessStatus:'Εκκρεμεί'},
]
export const loadIncidents=()=>qualityRepository.findIncidents(IS_PRODUCTION?[]:DEFAULT_INCIDENTS)
export const saveIncidents=(rows=[])=>{const next=qualityRepository.replaceIncidents(rows);emitAppEvent(QUALITY_EVENT,next);return next}
export const loadCapa=()=>qualityRepository.findCapa(IS_PRODUCTION?[]:DEFAULT_CAPA)
export const saveCapa=(rows=[])=>{const next=qualityRepository.replaceCapa(rows);emitAppEvent(QUALITY_EVENT,next);return next}
export const loadAuditExecutions=()=>qualityRepository.findAudits()
export function saveAuditExecutions(rows=[]){const next=qualityRepository.replaceAudits(rows);emitAppEvent(AUDITS_EVENT,next);return next}
export function upsertAuditExecution(record={}){const now=new Date().toISOString();const normalized={...record,id:record.id||`AUD-${Date.now().toString().slice(-7)}`,createdAt:record.createdAt||now,updatedAt:now};const rows=loadAuditExecutions();const exists=rows.some((item)=>item.id===normalized.id);saveAuditExecutions(exists?rows.map((item)=>item.id===normalized.id?normalized:item):[normalized,...rows]);return normalized}
export const deleteAuditExecution=(id)=>saveAuditExecutions(loadAuditExecutions().filter((item)=>item.id!==id))
