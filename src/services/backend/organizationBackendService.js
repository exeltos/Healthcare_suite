import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadTraining,upsertTraining,deleteTraining,loadCommittees,upsertCommittee,deleteCommittee,loadDocuments,upsertDocument,deleteDocument,replaceTrainingCollection,replaceCommitteesCollection,replaceDocumentsCollection } from '../organizationService'

export async function loadOperationalTraining(){
  if(!IS_PRODUCTION)return loadTraining()
  const c=requireSupabase();const {data,error}=await c.from('training_records').select('*,department:departments(id,name)').order('training_date',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapTraining);if(JSON.stringify(loadTraining())!==JSON.stringify(rows))replaceTrainingCollection(rows);return rows
}
export async function saveOperationalTraining(input={}){
  if(!IS_PRODUCTION)return upsertTraining(input)
  const c=requireSupabase(),org=await orgId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`TR-${Date.now()}`}
  const trainingDate=date(row.date),validUntil=date(row.validUntil)
  if(!String(row.title||'').trim()||!trainingDate)throw new Error('Training title and date are required.')
  if(validUntil&&validUntil<trainingDate)throw new Error('Training validity date cannot precede the training date.')
  const attendance=Array.isArray(row.attendance)?row.attendance:[]
  const employeeIds=[...new Set(attendance.map(item=>String(item.employeeId||'').trim()).filter(Boolean))]
  if(employeeIds.length){
    const {data:staff,error:staffError}=await c.from('employees').select('id,department_id,status').eq('organization_id',org).in('id',employeeIds)
    if(staffError)throw staffError
    const staffMap=new Map((staff||[]).map(item=>[String(item.id),item]))
    for(const item of attendance){
      if(!item.employeeId)continue
      const employee=staffMap.get(String(item.employeeId))
      if(!employee)throw new Error('Training attendance contains an employee outside the current organization.')
      if(employee.status==='inactive'&&String(row.status||'')!=='Ολοκληρωμένη')throw new Error('Inactive employees cannot be newly assigned to training.')
    }
  }
  const seenAttendance=new Set()
  for(const item of attendance){
    const key=String(item.employeeId||item.employeeName||'').trim().toLocaleLowerCase('el-GR')
    if(key&&seenAttendance.has(key))throw new Error('Training attendance contains the same employee more than once.')
    if(key)seenAttendance.add(key)
  }
  const payload={id:String(row.id),organization_id:org,department_id:dep,title:String(row.title||''),category:String(row.category||''),trainer:String(row.trainer||''),training_date:trainingDate,status:String(row.status||'Προγραμματισμένη'),duration_hours:Number(row.durationHours||0),valid_until:validUntil,attendance,attachments:Array.isArray(row.attachments)?row.attachments:[],notes:String(row.notes||''),data:rest(row,['id','department','title','category','trainer','date','status','durationHours','validUntil','attendance','attachments','notes','createdAt','updatedAt'])}
  const {data,error}=await c.from('training_records').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error;return mapTraining(data)
}
export async function deleteOperationalTraining(id){
  if(!IS_PRODUCTION)return deleteTraining(id)
  const c=requireSupabase();const {error}=await c.from('training_records').delete().eq('id',String(id));if(error)throw error;return true
}

export async function loadOperationalCommittees(){
  if(!IS_PRODUCTION)return loadCommittees()
  const c=requireSupabase();const {data,error}=await c.from('committees').select('*').order('name');if(error)throw error
  const rows=(data||[]).map(mapCommittee);if(JSON.stringify(loadCommittees())!==JSON.stringify(rows))replaceCommitteesCollection(rows);return rows
}
export async function saveOperationalCommittee(input={}){
  if(!IS_PRODUCTION)return upsertCommittee(input)
  const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`CM-${Date.now()}`}
  if(!String(row.name||'').trim())throw new Error('Committee name is required.')
  const {data:duplicateCommittee,error:duplicateCommitteeError}=await c.from('committees').select('id').eq('organization_id',org).ilike('name',String(row.name).trim()).neq('id',String(row.id)).limit(1)
  if(duplicateCommitteeError)throw duplicateCommitteeError
  if(duplicateCommittee?.length)throw new Error('Committee name already exists.')
  const members=Array.isArray(row.members)?row.members:[]
  const employeeIds=[...new Set(members.map(item=>String(item.employeeId||'').trim()).filter(Boolean))]
  if(employeeIds.length){const {data:staff,error:staffError}=await c.from('employees').select('id').eq('organization_id',org).in('id',employeeIds);if(staffError)throw staffError;if((staff||[]).length!==employeeIds.length)throw new Error('Committee contains a registry member outside the current organization.')}
  const memberKeys=new Set()
  for(const member of members){const key=String(member.employeeId||member.fullName||'').trim().toLocaleLowerCase('el-GR');if(key&&memberKeys.has(key))throw new Error('Committee contains the same member more than once.');if(key)memberKeys.add(key)}
  const meetings=Array.isArray(row.meetings)?row.meetings:[]
  const allowedMemberIds=new Set(members.map(member=>String(member.id)))
  for(const mt of meetings){
    if((mt.presentIds||[]).some(id=>!allowedMemberIds.has(String(id))))throw new Error('Meeting attendance contains a person who is not a committee member.')
    if(new Set(mt.presentIds||[]).size!==(mt.presentIds||[]).length)throw new Error('Meeting attendance contains duplicate presence.')
    for(const action of mt.actions||[]){if(action.dueDate&&mt.date&&action.dueDate<mt.date)throw new Error('Decision action due date cannot precede the meeting date.')}
  }
  if(row.lastMeeting&&row.nextMeeting&&row.nextMeeting<row.lastMeeting)throw new Error('Next committee meeting cannot precede the last meeting.')
  const payload={id:String(row.id),organization_id:org,name:String(row.name||''),committee_type:String(row.type||'Επιτροπή'),chair:String(row.chair||''),secretary:String(row.secretary||''),last_meeting:date(row.lastMeeting),next_meeting:date(row.nextMeeting),status:String(row.status||'Ενεργή'),frequency:String(row.frequency||''),member_ids:Array.isArray(row.memberIds)?row.memberIds:[],members:Array.isArray(row.members)?row.members:[],agenda:Array.isArray(row.agenda)?row.agenda:[],meetings:Array.isArray(row.meetings)?row.meetings:[],attachments:Array.isArray(row.attachments)?row.attachments:[],purpose:String(row.purpose||''),notes:String(row.notes||''),data:rest(row,['id','name','type','chair','secretary','lastMeeting','nextMeeting','status','frequency','memberIds','members','agenda','meetings','attachments','purpose','notes','createdAt','updatedAt'])}
  const {data,error}=await c.from('committees').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return mapCommittee(data)
}
export async function deleteOperationalCommittee(id){
  if(!IS_PRODUCTION)return deleteCommittee(id)
  const c=requireSupabase();const {error}=await c.from('committees').delete().eq('id',String(id));if(error)throw error;return true
}

export async function loadOperationalDocuments(){
  if(!IS_PRODUCTION)return loadDocuments()
  const c=requireSupabase();const {data,error}=await c.from('controlled_documents').select('*').order('title');if(error)throw error
  const rows=(data||[]).map(mapDocument);if(JSON.stringify(loadDocuments())!==JSON.stringify(rows))replaceDocumentsCollection(rows);return rows
}
export async function saveOperationalDocument(input={}){
  if(!IS_PRODUCTION)return upsertDocument(input)
  const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`DOC-${Date.now()}`}
  if(!String(row.title||'').trim()||!String(row.code||'').trim())throw new Error('Document title and code are required.')
  const {data:duplicateDocument,error:duplicateDocumentError}=await c.from('controlled_documents').select('id').eq('organization_id',org).ilike('code',String(row.code).trim()).neq('id',String(row.id)).limit(1)
  if(duplicateDocumentError)throw duplicateDocumentError
  if(duplicateDocument?.length)throw new Error('Document code already exists.')
  if(row.status==='Σε ισχύ'&&!(Array.isArray(row.attachments)&&row.attachments.length))throw new Error('An in-force document must have at least one attachment.')
  const versions=Array.isArray(row.versions)?row.versions:[]
  const versionKeys=versions.map(v=>String(v.version||'').trim()).filter(Boolean)
  if(new Set(versionKeys).size!==versionKeys.length)throw new Error('Document version history contains duplicate version numbers.')
  const payload={id:String(row.id),organization_id:org,title:String(row.title||''),code:String(row.code||''),category:String(row.category||''),version:String(row.version||''),owner:String(row.owner||''),status:String(row.status||'Σε ισχύ'),review_date:date(row.reviewDate),attachments:Array.isArray(row.attachments)?row.attachments:[],versions:Array.isArray(row.versions)?row.versions:[],data:rest(row,['id','title','code','category','version','owner','status','reviewDate','attachments','versions','createdAt','updatedAt'])}
  const {data,error}=await c.from('controlled_documents').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return mapDocument(data)
}
export async function deleteOperationalDocument(id){
  if(!IS_PRODUCTION)return deleteDocument(id)
  const c=requireSupabase();const {error}=await c.from('controlled_documents').delete().eq('id',String(id));if(error)throw error;return true
}

function mapTraining(r){return {...r.data,id:r.id,title:r.title,category:r.category,department:one(r.department)?.name||'',trainer:r.trainer,date:r.training_date||'',status:r.status,durationHours:Number(r.duration_hours||0),validUntil:r.valid_until||'',attendance:Array.isArray(r.attendance)?r.attendance:[],attachments:Array.isArray(r.attachments)?r.attachments:[],notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at}}
function mapCommittee(r){return {...r.data,id:r.id,name:r.name,type:r.committee_type,chair:r.chair,secretary:r.secretary,lastMeeting:r.last_meeting||'',nextMeeting:r.next_meeting||'',status:r.status,frequency:r.frequency,memberIds:Array.isArray(r.member_ids)?r.member_ids:[],members:Array.isArray(r.members)?r.members:[],agenda:Array.isArray(r.agenda)?r.agenda:[],meetings:Array.isArray(r.meetings)?r.meetings:[],attachments:Array.isArray(r.attachments)?r.attachments:[],purpose:r.purpose,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at}}
function mapDocument(r){return {...r.data,id:r.id,title:r.title,code:r.code,category:r.category,version:r.version,owner:r.owner,status:r.status,reviewDate:r.review_date||'',attachments:Array.isArray(r.attachments)?r.attachments:[],versions:Array.isArray(r.versions)?r.versions:[],createdAt:r.created_at,updatedAt:r.updated_at}}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function rest(o,keys){const x={...o};keys.forEach(k=>delete x[k]);return x}
function one(v){return Array.isArray(v)?v[0]:v}
