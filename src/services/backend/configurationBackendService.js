import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadFormTemplates,saveFormTemplates } from '../formTemplatesService'
import { loadFormResponses,saveFormResponses } from '../formResponsesService'
import { loadMasterData,saveMasterData } from '../masterDataService'
import { writeJsonCache } from '../../core/storage'
import { loadStudioRows,saveStudioRows,studioModules } from '../studioConfigService'

export async function hydrateFormsBackend(){
 if(!IS_PRODUCTION)return {templates:loadFormTemplates(),responses:loadFormResponses()}
 const c=requireSupabase()
 const [t,r]=await Promise.all([c.from('form_templates').select('*').order('name'),c.from('form_responses').select('*').order('created_at',{ascending:false})])
 if(t.error)throw t.error;if(r.error)throw r.error
 const templates=(t.data||[]).map(x=>({...x.data,id:x.id,name:x.name,type:x.form_type,category:x.category,status:x.status,description:x.description,appliesTo:x.applies_to||[],scoring:x.scoring||{},questions:x.questions||[],createdAt:x.created_at,updatedAt:x.updated_at}))
 const responses=(r.data||[]).map(x=>({...x.data,id:x.id,templateId:x.template_id||'',subjectType:x.subject_type,subjectId:x.subject_id,date:x.response_date||'',status:x.status,answers:x.answers||{},createdAt:x.created_at,updatedAt:x.updated_at}))
 saveFormTemplates(templates);saveFormResponses(responses);return {templates,responses}
}
export async function saveFormTemplateBackend(input={}){
 if(!IS_PRODUCTION){const rows=loadFormTemplates(),row={...input,id:input.id||`TPL-${Date.now()}`};saveFormTemplates([row,...rows.filter(x=>x.id!==row.id)]);return row}
 const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`TPL-${Date.now()}`}
 const payload={id:String(row.id),organization_id:org,name:String(row.name||''),form_type:String(row.type||'checklist'),category:String(row.category||''),status:String(row.status||'active'),description:String(row.description||''),applies_to:Array.isArray(row.appliesTo)?row.appliesTo:[],scoring:row.scoring||{},questions:Array.isArray(row.questions)?row.questions:[],data:rest(row,['id','name','type','category','status','description','appliesTo','scoring','questions','createdAt','updatedAt'])}
 const {error}=await c.from('form_templates').upsert(payload,{onConflict:'id'});if(error)throw error;await hydrateFormsBackend();return row
}
export async function deleteFormTemplateBackend(id){
 if(!IS_PRODUCTION){saveFormTemplates(loadFormTemplates().filter(x=>x.id!==id));return true}
 const c=requireSupabase();const {error}=await c.from('form_templates').delete().eq('id',String(id));if(error)throw error;await hydrateFormsBackend();return true
}
export async function saveFormResponseBackend(input={}){
 if(!IS_PRODUCTION){const rows=loadFormResponses(),row={...input,id:input.id||`RSP-${Date.now()}`};saveFormResponses([row,...rows.filter(x=>x.id!==row.id)]);return row}
 const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`RSP-${Date.now()}`}
 const payload={id:String(row.id),organization_id:org,template_id:row.templateId||null,subject_type:String(row.subjectType||''),subject_id:String(row.subjectId||''),response_date:date(row.date),status:String(row.status||''),answers:row.answers||{},data:rest(row,['id','templateId','subjectType','subjectId','date','status','answers','createdAt','updatedAt'])}
 const {error}=await c.from('form_responses').upsert(payload,{onConflict:'id'});if(error)throw error;await hydrateFormsBackend();return row
}
export async function deleteFormResponseBackend(id){
 if(!IS_PRODUCTION){saveFormResponses(loadFormResponses().filter(x=>x.id!==id));return true}
 const c=requireSupabase();const {error}=await c.from('form_responses').delete().eq('id',String(id));if(error)throw error;await hydrateFormsBackend();return true
}

export async function hydrateMasterDataBackend(){
 if(!IS_PRODUCTION)return loadMasterData()
 const c=requireSupabase(),org=await orgId(c);const {data,error}=await c.from('master_data_libraries').select('library_key,rows').eq('organization_id',org);if(error)throw error
 if(!(data||[]).length)return loadMasterData()
 const merged={...loadMasterData(),...Object.fromEntries(data.map(r=>[r.library_key,Array.isArray(r.rows)?r.rows:[]]))};writeJsonCache('limoxisMasterData',merged);return merged
}
export async function saveMasterDataBackend(next={}){
 if(!IS_PRODUCTION)return saveMasterData(next)
 const c=requireSupabase(),org=await orgId(c),rows=Object.entries(next).map(([key,value])=>({organization_id:org,library_key:key,rows:Array.isArray(value)?value:[]}))
 const {error:del}=await c.from('master_data_libraries').delete().eq('organization_id',org);if(del)throw del
 if(rows.length){const {error}=await c.from('master_data_libraries').insert(rows);if(error)throw error}writeJsonCache('limoxisMasterData',next);return next
}
export async function hydrateStudioBackend(){
 if(!IS_PRODUCTION)return Object.fromEntries(Object.keys(studioModules).map(k=>[k,loadStudioRows(k)]))
 const c=requireSupabase(),org=await orgId(c);const {data,error}=await c.from('studio_configuration').select('module_key,rows').eq('organization_id',org);if(error)throw error
 for(const r of data||[])if(studioModules[r.module_key])saveStudioRows(r.module_key,Array.isArray(r.rows)?r.rows:[])
 return Object.fromEntries(Object.keys(studioModules).map(k=>[k,loadStudioRows(k)]))
}
export async function saveStudioRowsBackend(moduleKey,rows=[]){
 if(!IS_PRODUCTION)return saveStudioRows(moduleKey,rows)
 if(!studioModules[moduleKey])throw new Error('Unknown Studio configuration module.')
 const cleanRows=Array.isArray(rows)?rows:[]
 const ids=cleanRows.map(row=>String(row.id||'').trim()).filter(Boolean)
 if(new Set(ids).size!==ids.length)throw new Error('Studio configuration contains duplicate row identifiers.')
 const c=requireSupabase(),org=await orgId(c);const {error}=await c.from('studio_configuration').upsert({organization_id:org,module_key:moduleKey,rows:Array.isArray(rows)?rows:[]},{onConflict:'organization_id,module_key'});if(error)throw error;saveStudioRows(moduleKey,rows);return rows
}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function rest(o,keys){const x={...o};keys.forEach(k=>delete x[k]);return x}
