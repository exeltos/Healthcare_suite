import { loadCapa, saveCapa } from './qualityService'
import { loadAuditExecutions } from './qualityService'
import { IS_PRODUCTION } from '../core/runtime'
import { loadQualityAudits, loadQualityCapa, saveQualityCapa } from './backend/qualityBackendService'

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

export function buildQualityTimeline({ incident, audit, capa, relatedCapa=[], relatedAudits=[], language='el' }={}) {
  const L=(el,en)=>language==='en'?en:el
  const display=(value)=>{
    const en={
      'Νέα αναφορά':'New report','Υπό διερεύνηση':'Under investigation','Σε ενέργειες βελτίωσης':'Improvement actions','Κλειστό':'Closed',
      'Ανοικτή':'Open','Σε εξέλιξη':'In progress','Σε επαλήθευση':'Verification','Ολοκληρωμένη':'Completed','Ακυρωμένη':'Cancelled',
      'Εκκρεμεί':'Pending','Αποτελεσματική':'Effective','Μερικώς αποτελεσματική':'Partially effective','Μη αποτελεσματική':'Ineffective',
    }
    return language==='en'?(en[value]||value):value
  }
  const items=[]
  if (incident) items.push({id:incident.id,type:'incident',title:L('Συμβάν','Incident'),description:incident.title,date:incident.date,time:incident.time,badge:display(incident.status),badgeTone:'info'})
  relatedAudits.forEach((row)=>items.push({id:row.id,type:'audit',title:'Audit',description:row.templateName||row.scope||'Audit',date:row.date,badge:`${row.compliance ?? '—'}%`,badgeTone:(row.findings||[]).length?'warning':'success'}))
  if (audit) items.push({id:audit.id,type:'audit',title:'Audit',description:audit.templateName||audit.scope||'Audit',date:audit.date,badge:`${audit.compliance ?? '—'}%`,badgeTone:(audit.findings||[]).length?'warning':'success'})
  const capaRows=capa?[capa,...relatedCapa.filter(r=>r.id!==capa.id)]:relatedCapa
  capaRows.forEach((row)=>{
    items.push({id:row.id,type:'capa',title:'CAPA',description:row.title,date:(row.createdAt||'').slice(0,10),badge:display(row.status),badgeTone:row.status==='Ολοκληρωμένη'?'success':row.status==='Σε επαλήθευση'?'warning':'info'})
    if(row.effectivenessDate) items.push({id:`${row.id}-verification`,type:'verification',title:L('Έλεγχος αποτελεσματικότητας','Effectiveness verification'),description:row.effectivenessNotes||row.title,date:row.effectivenessDate,badge:display(row.effectivenessStatus),badgeTone:row.effectivenessStatus==='Αποτελεσματική'?'success':row.effectivenessStatus==='Μη αποτελεσματική'?'danger':'warning',clickable:false})
  })
  return items.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))
}


export async function createCapaFromSourceAsync(input={}) {
  if(!IS_PRODUCTION) return createCapaFromSource(input)
  const id=`CAPA-${Date.now().toString().slice(-7)}`
  const now=new Date().toISOString()
  return saveQualityCapa({
    id,
    title:input.title,
    source:input.sourceId||'',
    sourceType:input.sourceType||'Άλλο',
    parentId:input.parentId||'',
    actionType:'Διορθωτική',
    owner:input.owner||'Ομάδα Ποιότητας',
    department:input.department||'',
    dueDate:'',
    priority:input.priority||'Μέτρια',
    progress:0,
    status:'Ανοικτή',
    description:input.description||'',
    rootCause:input.rootCause||'',
    plannedAction:'',
    evidence:'',
    effectivenessStatus:'Εκκρεμεί',
    effectivenessDate:'',
    effectivenessNotes:'',
    createdAt:now,
    updatedAt:now,
  })
}

export async function getRelatedQualityRecordsAsync(sourceId) {
  if(!IS_PRODUCTION) return getRelatedQualityRecords(sourceId)
  const [capa,audits]=await Promise.all([loadQualityCapa(),loadQualityAudits()])
  return {
    capa:capa.filter(row=>row.source===sourceId||row.parentId===sourceId),
    audits:audits.filter(row=>row.source===sourceId),
  }
}
