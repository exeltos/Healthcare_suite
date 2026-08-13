import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadControlPrograms,saveControlPrograms,loadControlExecutions,saveControlExecutions,upsertControlProgram,deleteControlProgram,completeProgram } from '../surveillanceControlsService'
import { saveClinicalSourceSample } from './clinicalSupportBackendService'

export async function loadSurveillanceControlPrograms(){
 if(!IS_PRODUCTION)return loadControlPrograms()
 const c=requireSupabase();const {data,error}=await c.from('surveillance_control_programs').select('*,department:departments(id,name)').order('next_due_date');if(error)throw error
 const rows=(data||[]).map(mapProgram);saveControlPrograms(rows);return rows
}
export async function saveSurveillanceControlProgram(input={}){
 if(!IS_PRODUCTION)return upsertControlProgram(input)
 const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`CTRL-${Date.now()}`}
 const payload={id:String(row.id),organization_id:org,department_id:dep,title:String(row.title||''),category:String(row.category||''),control_type:String(row.controlType||''),next_due_date:date(row.nextDueDate),active:row.active!==false,data:row}
 const {data,error}=await c.from('surveillance_control_programs').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error
 await loadSurveillanceControlPrograms();return mapProgram(data)
}
export async function deleteSurveillanceControlProgram(id){
 if(!IS_PRODUCTION)return deleteControlProgram(id)
 const c=requireSupabase();const {error}=await c.from('surveillance_control_programs').delete().eq('id',String(id));if(error)throw error;await loadSurveillanceControlPrograms();return true
}
export async function loadSurveillanceControlExecutions(){
 if(!IS_PRODUCTION)return loadControlExecutions()
 const c=requireSupabase();const {data,error}=await c.from('surveillance_control_executions').select('*,department:departments(id,name)').order('performed_date',{ascending:false});if(error)throw error
 const rows=(data||[]).map(mapExecution);saveControlExecutions(rows);return rows
}
export async function completeSurveillanceControlProgram(program,execution){
 if(!IS_PRODUCTION)return completeProgram(program,execution)
 const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,execution.department||program.department)
 const savedExecution={...execution,id:execution.id||`EXEC-${Date.now()}`,programId:program.id,category:program.category,department:execution.department||program.department,location:execution.location||program.location,owner:execution.owner||program.owner,dueDate:execution.dueDate||program.nextDueDate}
 const {error}=await c.from('surveillance_control_executions').upsert({id:String(savedExecution.id),organization_id:org,program_id:String(program.id),department_id:dep,performed_date:date(savedExecution.performedDate),category:String(program.category||''),data:savedExecution},{onConflict:'id'});if(error)throw error
 const nextDueDate=addInterval(savedExecution.performedDate||program.nextDueDate,program.recurrence,program.interval)
 await saveSurveillanceControlProgram({...program,lastCompletedDate:savedExecution.performedDate,nextDueDate,active:program.recurrence==='once'?false:program.active})
 for(let index=0;index<(savedExecution.items||[]).length;index+=1){
  const item=savedExecution.items[index];if(!item.sampleCode&&!item.microorganism&&!item.resultStatus)continue
  await saveClinicalSourceSample({id:item.labRecordId||`${program.category==='Νερό'?'WATER':'ENV'}-${savedExecution.id}-${index+1}`,sourceType:program.category==='Νερό'?'Νερό':'Περιβάλλον',department:savedExecution.department,subjectName:item.samplingPoint||savedExecution.location,sampleCode:item.sampleCode||'',sampleType:item.sampleType||(program.category==='Νερό'?'Δείγμα νερού':'Περιβαλλοντικό δείγμα'),collectionDate:savedExecution.performedDate,collector:savedExecution.owner,microorganism:item.microorganism||'',resultNotes:item.resultNotes||'',status:item.resultStatus||'Εκκρεμεί',acceptable:item.acceptable||'',notes:savedExecution.notes||''})
 }
 await loadSurveillanceControlExecutions();return savedExecution
}
function mapProgram(r){return {...r.data,id:r.id,department:(Array.isArray(r.department)?r.department[0]:r.department)?.name||r.data?.department||'',title:r.title,category:r.category,controlType:r.control_type,nextDueDate:r.next_due_date||'',active:r.active}}
function mapExecution(r){return {...r.data,id:r.id,programId:r.program_id||r.data?.programId||'',department:(Array.isArray(r.department)?r.department[0]:r.department)?.name||r.data?.department||'',performedDate:r.performed_date||'',category:r.category}}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function addInterval(value,recurrence,interval=1){if(!value||recurrence==='once')return'';const d=new Date(`${value}T12:00:00`),n=Math.max(1,Number(interval||1));if(recurrence==='days')d.setDate(d.getDate()+n);if(recurrence==='weeks')d.setDate(d.getDate()+n*7);if(recurrence==='months')d.setMonth(d.getMonth()+n);if(recurrence==='years')d.setFullYear(d.getFullYear()+n);return d.toISOString().slice(0,10)}
