import { loadCapa, saveCapa } from './qualityService'
import { loadAuditExecutions } from './qualityService'

export function createCapaFromSource({ sourceId, sourceType, title, department='', owner='Ομάδα Ποιότητας', priority='Μέτρια', description='', rootCause='', parentId='' }) {
  const id = `CAPA-${Date.now().toString().slice(-7)}`
  const now = new Date().toISOString()
  const record = {
    id, title, source: sourceId || '', sourceType: sourceType || 'Άλλο', parentId,
    actionType:'Διορθωτική', owner, department, dueDate:'', priority, progress:0,
    status:'Ανοικτή', description, rootCause, plannedAction:'', evidence:'',
    effectivenessStatus:'Εκκρεμεί', effectivenessDate:'', effectivenessNotes:'',
    createdAt:now, updatedAt:now,
  }
  saveCapa([record, ...loadCapa()])
  return record
}

export function getRelatedQualityRecords(sourceId) {
  const capa = loadCapa().filter((row) => row.source === sourceId || row.parentId === sourceId)
  const audits = loadAuditExecutions().filter((row) => row.source === sourceId)
  return { capa, audits }
}

export function buildQualityTimeline({ incident, audit, capa, relatedCapa=[], relatedAudits=[] }={}) {
  const items=[]
  if (incident) items.push({id:incident.id,type:'incident',title:'Συμβάν',description:incident.title,date:incident.date,time:incident.time,badge:incident.status,badgeTone:'info'})
  relatedAudits.forEach((row)=>items.push({id:row.id,type:'audit',title:'Audit',description:row.templateName||row.scope||'Audit',date:row.date,badge:`${row.compliance ?? '—'}%`,badgeTone:(row.findings||[]).length?'warning':'success'}))
  if (audit) items.push({id:audit.id,type:'audit',title:'Audit',description:audit.templateName||audit.scope||'Audit',date:audit.date,badge:`${audit.compliance ?? '—'}%`,badgeTone:(audit.findings||[]).length?'warning':'success'})
  const capaRows=capa?[capa,...relatedCapa.filter(r=>r.id!==capa.id)]:relatedCapa
  capaRows.forEach((row)=>{
    items.push({id:row.id,type:'capa',title:'CAPA',description:row.title,date:(row.createdAt||'').slice(0,10),badge:row.status,badgeTone:row.status==='Ολοκληρωμένη'?'success':row.status==='Σε επαλήθευση'?'warning':'info'})
    if(row.effectivenessDate) items.push({id:`${row.id}-verification`,type:'verification',title:'Έλεγχος αποτελεσματικότητας',description:row.effectivenessNotes||row.title,date:row.effectivenessDate,badge:row.effectivenessStatus,badgeTone:row.effectivenessStatus==='Αποτελεσματική'?'success':row.effectivenessStatus==='Μη αποτελεσματική'?'danger':'warning',clickable:false})
  })
  return items.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))
}
