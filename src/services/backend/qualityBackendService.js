import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadIncidents,saveIncidents,loadCapa,saveCapa,loadAuditExecutions,saveAuditExecutions,upsertAuditExecution,deleteAuditExecution,loadRisks,saveRisks } from '../qualityService'

export async function loadQualityIncidents(){
  if(!IS_PRODUCTION)return loadIncidents()
  const c=requireSupabase();const {data,error}=await c.from('quality_incidents').select('*,department:departments(id,name)').order('incident_date',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapIncident);mirrorQuality('incidents',rows);return rows
}
export async function saveQualityIncident(input={}){
  if(!IS_PRODUCTION){const row={...input,id:input.id||`INC-${Date.now()}`};saveIncidents([row,...loadIncidents().filter(x=>x.id!==row.id)]);return row}
  const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`INC-${Date.now().toString().slice(-7)}`}
  if(!String(row.title||'').trim()||!date(row.date))throw new Error('Incident title and date are required.')
  const payload={id:String(row.id),organization_id:org,department_id:dep,incident_date:date(row.date),incident_time:time(row.time),title:String(row.title||''),category:String(row.category||''),outcome:String(row.outcome||''),status:String(row.status||'Νέα αναφορά'),owner:String(row.owner||''),description:String(row.description||''),data:rest(row,['id','department','date','time','title','category','outcome','status','owner','description'])}
  const {data,error}=await c.from('quality_incidents').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error;return mapIncident(data)
}
export async function deleteQualityIncident(id, reason=''){
  const archivedAt=new Date().toISOString()
  if(!IS_PRODUCTION){saveIncidents(loadIncidents().map(x=>String(x.id)===String(id)?{...x,status:'Ακυρωμένο',archivedAt,archiveReason:String(reason||'')}:x));return true}
  const c=requireSupabase();const {error}=await c.from('quality_incidents').update({status:'Ακυρωμένο',archived_at:archivedAt,archived_by:(await c.auth.getUser()).data.user?.id||null,archive_reason:String(reason||'')}).eq('id',String(id));if(error)throw error;return true
}

export async function loadQualityCapa(){
  if(!IS_PRODUCTION)return loadCapa()
  const c=requireSupabase();const {data,error}=await c.from('quality_capa').select('*,department:departments(id,name)').order('created_at',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapCapa);mirrorQuality('capa',rows);return rows
}
export async function saveQualityCapa(input={}){
  if(!IS_PRODUCTION){const row={...input,id:input.id||`CAPA-${Date.now()}`};saveCapa([row,...loadCapa().filter(x=>x.id!==row.id)]);return row}
  const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`CAPA-${Date.now().toString().slice(-7)}`}
  if(!String(row.title||'').trim())throw new Error('Improvement action title is required.')
  if(row.dueDate&&row.createdAt&&date(row.dueDate)<String(row.createdAt).slice(0,10))throw new Error('Improvement action due date cannot precede its creation date.')
  if(row.source&&row.sourceType==='Συμβάν'){const {data:source}=await c.from('quality_incidents').select('id').eq('organization_id',org).eq('id',String(row.source)).maybeSingle();if(!source)throw new Error('Linked incident was not found in the current organization.')}
  if(row.source&&row.sourceType==='Audit'){const {data:source}=await c.from('quality_audits').select('id').eq('organization_id',org).eq('id',String(row.source)).maybeSingle();if(!source)throw new Error('Linked audit was not found in the current organization.')}
  if(row.source&&row.sourceType==='Κίνδυνος'){const {data:source}=await c.from('quality_risks').select('id').eq('organization_id',org).eq('id',String(row.source)).maybeSingle();if(!source)throw new Error('Linked risk was not found in the current organization.')}
  const payload={id:String(row.id),organization_id:org,department_id:dep,source_id:String(row.source||''),source_type:String(row.sourceType||''),parent_id:String(row.parentId||''),title:String(row.title||''),action_type:String(row.actionType||'Διορθωτική'),owner:String(row.owner||''),due_date:date(row.dueDate),priority:String(row.priority||'Μέτρια'),progress:Number(row.progress||0),status:String(row.status||'Ανοικτή'),description:String(row.description||''),root_cause:String(row.rootCause||''),planned_action:String(row.plannedAction||''),evidence:String(row.evidence||''),effectiveness_status:String(row.effectivenessStatus||'Εκκρεμεί'),effectiveness_date:date(row.effectivenessDate),effectiveness_notes:String(row.effectivenessNotes||''),data:rest(row,['id','department','source','sourceType','parentId','title','actionType','owner','dueDate','priority','progress','status','description','rootCause','plannedAction','evidence','effectivenessStatus','effectivenessDate','effectivenessNotes','createdAt','updatedAt'])}
  const {data,error}=await c.from('quality_capa').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error;return mapCapa(data)
}
export async function deleteQualityCapa(id, reason=''){
  const archivedAt=new Date().toISOString()
  if(!IS_PRODUCTION){saveCapa(loadCapa().map(x=>String(x.id)===String(id)?{...x,status:'Ακυρωμένη',archivedAt,archiveReason:String(reason||'')}:x));return true}
  const c=requireSupabase();const {error}=await c.from('quality_capa').update({status:'Ακυρωμένη',archived_at:archivedAt,archived_by:(await c.auth.getUser()).data.user?.id||null,archive_reason:String(reason||'')}).eq('id',String(id));if(error)throw error;return true
}

export async function loadQualityAudits(){
  if(!IS_PRODUCTION)return loadAuditExecutions()
  const c=requireSupabase();const {data,error}=await c.from('quality_audits').select('*,department:departments(id,name)').order('audit_date',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapAudit);mirrorQuality('audits',rows);return rows
}
export async function saveQualityAudit(input={}){
  if(!IS_PRODUCTION){const finalizedAt=input.finalizedAt||(String(input.status||'')==='Ολοκληρωμένο'?new Date().toISOString():'');return upsertAuditExecution({...input,finalizedAt})}
  const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`AUD-${Date.now().toString().slice(-7)}`}
  const payload={id:String(row.id),organization_id:org,department_id:dep,template_id:row.templateId||null,template_name:String(row.templateName||''),audit_date:date(row.date),status:String(row.status||'Πρόχειρο'),compliance:row.compliance===''||row.compliance==null?null:Number(row.compliance),scope:String(row.scope||''),owner:String(row.owner||''),source_id:String(row.source||''),findings:Array.isArray(row.findings)?row.findings:[],answers:Array.isArray(row.answers)?row.answers:[],data:rest(row,['id','department','templateId','templateName','date','status','compliance','scope','owner','source','findings','answers','createdAt','updatedAt','archivedAt','archiveReason','finalizedAt']),archived_at:row.archivedAt||null,archive_reason:String(row.archiveReason||''),finalized_at:row.finalizedAt||(String(row.status||'')==='Ολοκληρωμένο'?new Date().toISOString():null),finalized_by:row.finalizedBy||((String(row.status||'')==='Ολοκληρωμένο'&&!row.finalizedAt)?(await c.auth.getUser()).data.user?.id||null:null)}
  const {data,error}=await c.from('quality_audits').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error;return mapAudit(data)
}
export async function deleteQualityAudit(id, reason=''){
  const archivedAt=new Date().toISOString()
  if(!IS_PRODUCTION){const rows=loadAuditExecutions().map(x=>String(x.id)===String(id)?{...x,status:'Ακυρωμένο',archivedAt,archiveReason:String(reason||'')}:x);saveAuditExecutions(rows);return true}
  const c=requireSupabase();const {error}=await c.from('quality_audits').update({status:'Ακυρωμένο',archived_at:archivedAt,archived_by:(await c.auth.getUser()).data.user?.id||null,archive_reason:String(reason||'')}).eq('id',String(id));if(error)throw error;return true
}


export async function loadQualityRisks(){
  if(!IS_PRODUCTION)return loadRisks()
  const c=requireSupabase();const {data,error}=await c.from('quality_risks').select('*,department:departments(id,name)').order('risk_score',{ascending:false}).order('updated_at',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapRisk);mirrorQuality('risks',rows);return rows
}
export async function saveQualityRisk(input={}){
  if(!IS_PRODUCTION){const now=new Date().toISOString();const row={...input,id:input.id||`RSK-${Date.now().toString().slice(-7)}`,updatedAt:now,createdAt:input.createdAt||now};saveRisks([row,...loadRisks().filter(x=>x.id!==row.id)]);return row}
  const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`RSK-${Date.now().toString().slice(-7)}`}
  if(!String(row.title||'').trim())throw new Error('Risk title is required.')
  const likelihood=Math.max(1,Math.min(5,Number(row.likelihood||1))),severity=Math.max(1,Math.min(5,Number(row.severity||1))),score=likelihood*severity
  const residualLikelihood=Math.max(1,Math.min(5,Number(row.residualLikelihood||likelihood))),residualSeverity=Math.max(1,Math.min(5,Number(row.residualSeverity||severity))),residualScore=residualLikelihood*residualSeverity
  const payload={id:String(row.id),organization_id:org,department_id:dep,title:String(row.title||''),category:String(row.category||''),description:String(row.description||''),likelihood,severity,risk_score:score,controls:String(row.controls||''),actions:String(row.actions||''),owner:String(row.owner||''),review_date:date(row.reviewDate),status:String(row.status||'Ανοικτός'),residual_likelihood:residualLikelihood,residual_severity:residualSeverity,residual_score:residualScore,data:rest(row,['id','department','title','category','description','likelihood','severity','riskScore','controls','actions','owner','reviewDate','status','residualLikelihood','residualSeverity','residualScore','createdAt','updatedAt','archivedAt','archiveReason'])}
  const {data,error}=await c.from('quality_risks').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error;return mapRisk(data)
}
export async function archiveQualityRisk(id, reason=''){
  const archivedAt=new Date().toISOString()
  if(!IS_PRODUCTION){saveRisks(loadRisks().map(x=>String(x.id)===String(id)?{...x,status:'Ακυρωμένος',archivedAt,archiveReason:String(reason||'')}:x));return true}
  const c=requireSupabase();const {error}=await c.from('quality_risks').update({status:'Ακυρωμένος',archived_at:archivedAt,archived_by:(await c.auth.getUser()).data.user?.id||null,archive_reason:String(reason||'')}).eq('id',String(id));if(error)throw error;return true
}

function mapIncident(r){return {...r.data,id:r.id,date:r.incident_date||'',time:String(r.incident_time||'').slice(0,5),title:r.title,category:r.category,department:one(r.department)?.name||'',outcome:r.outcome,status:r.status,owner:r.owner,description:r.description,archivedAt:r.archived_at||'',archiveReason:r.archive_reason||'',createdAt:r.created_at,updatedAt:r.updated_at}}
function mapCapa(r){return {...r.data,id:r.id,title:r.title,source:r.source_id,sourceType:r.source_type,parentId:r.parent_id,actionType:r.action_type,owner:r.owner,department:one(r.department)?.name||'',dueDate:r.due_date||'',priority:r.priority,progress:Number(r.progress||0),status:r.status,description:r.description,rootCause:r.root_cause,plannedAction:r.planned_action,evidence:r.evidence,effectivenessStatus:r.effectiveness_status,effectivenessDate:r.effectiveness_date||'',effectivenessNotes:r.effectiveness_notes,archivedAt:r.archived_at||'',archiveReason:r.archive_reason||'',createdAt:r.created_at,updatedAt:r.updated_at}}
function mapRisk(r){return {...r.data,id:r.id,title:r.title,category:r.category,description:r.description,department:one(r.department)?.name||'',likelihood:Number(r.likelihood||1),severity:Number(r.severity||1),riskScore:Number(r.risk_score||0),controls:r.controls,actions:r.actions,owner:r.owner,reviewDate:r.review_date||'',status:r.status,residualLikelihood:Number(r.residual_likelihood||1),residualSeverity:Number(r.residual_severity||1),residualScore:Number(r.residual_score||0),archivedAt:r.archived_at||'',archiveReason:r.archive_reason||'',createdAt:r.created_at,updatedAt:r.updated_at}}
function mapAudit(r){return {...r.data,id:r.id,department:one(r.department)?.name||'',templateId:r.template_id||'',templateName:r.template_name,date:r.audit_date||'',status:r.status,compliance:r.compliance==null?'':Number(r.compliance),scope:r.scope,owner:r.owner,source:r.source_id,findings:Array.isArray(r.findings)?r.findings:[],answers:Array.isArray(r.answers)?r.answers:[],archivedAt:r.archived_at||'',archiveReason:r.archive_reason||'',finalizedAt:r.finalized_at||'',finalizedBy:r.finalized_by||'',createdAt:r.created_at,updatedAt:r.updated_at}}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function time(v){const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}:00`:null}
function rest(o,keys){const x={...o};keys.forEach(k=>delete x[k]);return x}
function one(v){return Array.isArray(v)?v[0]:v}

function mirrorQuality(type,rows){
  if(type==='incidents'){
    const current=loadIncidents()
    if(JSON.stringify(current)!==JSON.stringify(rows))saveIncidents(rows)
  }else if(type==='capa'){
    const current=loadCapa()
    if(JSON.stringify(current)!==JSON.stringify(rows))saveCapa(rows)
  }else if(type==='risks'){
    const current=loadRisks()
    if(JSON.stringify(current)!==JSON.stringify(rows))saveRisks(rows)
  }else{
    const current=loadAuditExecutions()
    if(JSON.stringify(current)!==JSON.stringify(rows))saveAuditExecutions(rows)
  }
}
