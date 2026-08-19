import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadStaffSamples,loadEnvironmentalSamples,loadWaterRecords,saveStaffSamples,saveEnvironmentalSamples,saveWaterRecords,upsertStaffSample,upsertEnvironmentalSample,upsertWaterRecord,deleteStaffSample,deleteEnvironmentalSample,deleteWaterRecord } from '../laboratorySourcesService'
import { loadIsolations,upsertIsolation,deleteIsolation } from '../isolationsService'
import { loadPatientAttachments,addPatientAttachment,deletePatientAttachment } from '../patientAttachmentsService'
import { loadNotifiableDiseases,saveNotifiableDiseases } from '../notifiableDiseasesService'

export async function loadClinicalSourceSamples(){
  if(!IS_PRODUCTION)return [...loadStaffSamples(),...loadEnvironmentalSamples(),...loadWaterRecords()]
  const c=requireSupabase()
  const {data,error}=await c.from('laboratory_source_samples').select('*,department:departments(id,name),employee:employees(id,first_name,last_name,employee_code)').order('created_at',{ascending:false})
  if(error)throw error
  const rows=(data||[]).map(mapSource)
  const staff=rows.filter(row=>row.sourceType==='Προσωπικό')
  const environment=rows.filter(row=>row.sourceType==='Περιβάλλον')
  const water=rows.filter(row=>row.sourceType==='Νερό')
  // Supabase hydration updates the local mirrors silently. Emitting the same
  // domain events here would immediately re-trigger Laboratory workspace
  // hydration, causing an unbounded GET loop (patients/source samples/notifications).
  saveStaffSamples(staff,{emit:false})
  saveEnvironmentalSamples(environment,{emit:false})
  saveWaterRecords(water,{emit:false})
  return rows
}
export async function saveClinicalSourceSample(input={}){
  if(!IS_PRODUCTION)return localSaveSource(input)
  const c=requireSupabase(),org=await orgId(c)
  const dep=await departmentId(c,org,input.department)
  const employeeId=input.sourceType==='Προσωπικό'?await employeeIdFor(c,input):null
  const row={...input,id:input.id||`${sourcePrefix(input.sourceType)}-${Date.now()}`}
  const payload={id:String(row.id),organization_id:org,source_type:row.sourceType,employee_id:employeeId,department_id:dep,
    subject_name:String(row.subjectName||row.staffName||row.employeeName||row.environmentPoint||row.waterPoint||''),
    subject_code:String(row.subjectCode||row.staffCode||row.employeeCode||''),
    sample_type:String(row.sampleType||''),sample_reason:String(row.sampleReason||''),collection_date:date(row.collectionDate),
    collection_time:time(row.collectionTime),received_date:date(row.receivedDate),result_date:date(row.resultDate),
    status:String(row.status||row.resultStatus||'Εκκρεμεί'),microorganism:String(row.microorganism||''),resistance:String(row.resistance||''),
    sample_acceptance:String(row.sampleAcceptance||((row.sourceType==='Νερό'||row.sourceType==='Περιβάλλον'||row.sourceType==='Επιφάνεια')?'Εκκρεμεί':'Αποδεκτό')),rejection_reason:String(row.rejectionReason||''),
    validated_at:row.validatedAt||null,critical_result:Boolean(row.criticalResult),
    critical_communicated_to:String(row.criticalCommunicatedTo||''),critical_communicated_at:row.criticalCommunicatedAt||null,
    data:rest(row,['id','sourceType','department','subjectName','subjectCode','sampleType','sampleReason','collectionDate','collectionTime','receivedDate','resultDate','status','resultStatus','microorganism','resistance','sampleAcceptance','rejectionReason','validatedAt','criticalResult','criticalCommunicatedTo','criticalCommunicatedAt'])}
  const {data,error}=await c.from('laboratory_source_samples').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name),employee:employees(id,first_name,last_name,employee_code)').single()
  if(error)throw error
  // Production verification: do not report success until the row can be read back from Supabase.
  const {data:verified,error:verifyError}=await c.from('laboratory_source_samples')
    .select('*,department:departments(id,name),employee:employees(id,first_name,last_name,employee_code)')
    .eq('organization_id',org).eq('id',String(data.id)).eq('source_type',String(row.sourceType)).maybeSingle()
  if(verifyError)throw verifyError
  if(!verified?.id)throw new Error('Η εργαστηριακή εγγραφή δεν επιβεβαιώθηκε στο Supabase.')
  const mapped=mapSource(verified)
  localSaveSource(mapped)
  return mapped
}
export async function deleteClinicalSourceSample(record){
  if(!IS_PRODUCTION)return localDeleteSource(record)
  const c=requireSupabase();const {error}=await c.from('laboratory_source_samples').delete().eq('id',String(record.id));if(error)throw error;localDeleteSource(record);return true
}

export async function loadClinicalIsolations(patientId=''){
  if(!IS_PRODUCTION)return loadIsolations()
  const c=requireSupabase();let q=c.from('patient_isolations').select('*,department:departments(id,name),patient:patients(id,patient_code,first_name,last_name)').order('created_at',{ascending:false})
  if(patientId)q=q.eq('patient_id',String(patientId))
  const {data,error}=await q;if(error)throw error
  const rows=(data||[]).map(r=>({...r.data,id:r.id,patientId:r.patient_id,clinicalCaseId:r.surveillance_case_id||r.data?.clinicalCaseId||'',patientCode:one(r.patient)?.patient_code||'',patientName:[one(r.patient)?.first_name,one(r.patient)?.last_name].filter(Boolean).join(' '),department:one(r.department)?.name||'',isolationType:r.isolation_type,status:r.status,startDate:r.start_date||'',endDate:r.end_date||'',reason:r.reason||''}))
  if(!patientId){
    const current=loadIsolations()
    for(const item of current)deleteIsolation(item.id)
    for(const item of rows)upsertIsolation(item)
  }
  return rows
}
export async function saveClinicalIsolation(input={}){
  if(!IS_PRODUCTION)return upsertIsolation(input)
  const c=requireSupabase(),org=await orgId(c),pid=await patientIdFor(c,input),dep=await departmentId(c,org,input.department)
  const today=new Date().toISOString().slice(0,10)
  const row={...input,id:input.id||`ISO-${Date.now()}`}
  row.status=row.status==='Ακυρωμένη'?'Ακυρωμένη':(row.endDate&&row.endDate<today?'Ολοκληρωμένη':'Ενεργή')
  const payload={id:String(row.id),organization_id:org,patient_id:pid,surveillance_case_id:row.clinicalCaseId?String(row.clinicalCaseId):null,department_id:dep,isolation_type:String(row.isolationType||''),status:String(row.status||'Ενεργή'),start_date:date(row.startDate),end_date:date(row.endDate),reason:String(row.reason||''),data:rest(row,['id','patientId','patientCode','patientName','department','isolationType','status','startDate','endDate','reason'])}
  const {data,error}=await c.from('patient_isolations').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;const mapped={...row,id:data.id};upsertIsolation(mapped);return mapped
}
export async function deleteClinicalIsolation(id){
  if(!IS_PRODUCTION)return deleteIsolation(id)
  const c=requireSupabase();const {error}=await c.from('patient_isolations').delete().eq('id',String(id));if(error)throw error;deleteIsolation(id);return true
}

export async function loadClinicalAttachments(patientId){
  if(!IS_PRODUCTION)return loadPatientAttachments().filter(x=>String(x.patientKey)===String(patientId))
  const c=requireSupabase();const {data,error}=await c.from('patient_attachments').select('*').eq('patient_id',String(patientId)).order('created_at',{ascending:false});if(error)throw error
  return Promise.all((data||[]).map(async r=>{
    let previewUrl=''
    if(r.storage_path){
      const {data:signed}=await c.storage.from('patientattachments').createSignedUrl(r.storage_path,900)
      previewUrl=signed?.signedUrl||''
    }
    return {...r.data,id:r.id,patientKey:r.patient_id,name:r.file_name,type:r.mime_type||'',size:r.file_size||0,category:r.category||'',notes:r.notes||'',storagePath:r.storage_path||'',previewUrl,createdAt:r.created_at,uploadedAt:r.created_at}
  }))
}
export async function uploadClinicalAttachment(patientId,file,meta={}){
  if(!IS_PRODUCTION)return addPatientAttachment({...meta,patientKey:patientId,name:file?.name||meta.name,type:file?.type||meta.type,size:file?.size||meta.size})
  if(!file)throw new Error('File is required.')
  const c=requireSupabase(),org=await orgId(c),id=`ATT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
  const safe=String(file.name||'attachment').replace(/[^\w.\-]+/g,'_'),path=`${org}/${patientId}/${id}-${safe}`
  const {error:uploadError}=await c.storage.from('patientattachments').upload(path,file,{upsert:false,contentType:file.type||undefined});if(uploadError)throw uploadError
  const payload={id,organization_id:org,patient_id:String(patientId),storage_path:path,file_name:String(file.name||safe),mime_type:file.type||null,file_size:file.size||null,category:String(meta.category||''),notes:String(meta.notes||''),data:rest(meta,['category','notes'])}
  const {data,error}=await c.from('patient_attachments').insert(payload).select().single()
  if(error){await c.storage.from('patientattachments').remove([path]);throw error}
  return {...meta,id:data.id,patientKey:patientId,name:data.file_name,type:data.mime_type||'',size:data.file_size||0,storagePath:data.storage_path,createdAt:data.created_at}
}
export async function deleteClinicalAttachment(record){
  if(!IS_PRODUCTION)return deletePatientAttachment(record.id)
  const c=requireSupabase();if(record.storagePath){const {error}=await c.storage.from('patientattachments').remove([record.storagePath]);if(error)throw error}
  const {error}=await c.from('patient_attachments').delete().eq('id',String(record.id));if(error)throw error;return true
}
export async function signedClinicalAttachmentUrl(record,expires=300){
  if(!IS_PRODUCTION||!record?.storagePath)return ''
  const c=requireSupabase();const {data,error}=await c.storage.from('patientattachments').createSignedUrl(record.storagePath,expires);if(error)throw error;return data?.signedUrl||''
}

export async function loadClinicalNotifiableDiseases(){
  if(!IS_PRODUCTION)return loadNotifiableDiseases()
  const c=requireSupabase();const {data,error}=await c.from('notifiable_diseases').select('*,department:departments(id,name),patient:patients(id,patient_code,first_name,last_name)').order('created_at',{ascending:false});if(error)throw error
  const rows=(data||[]).map(mapDisease);saveNotifiableDiseases(rows);return rows
}
export async function saveClinicalNotifiableDisease(input={}){
  if(!IS_PRODUCTION){const rows=loadNotifiableDiseases();const row={...input,id:input.id||`YDN-${Date.now()}`};saveNotifiableDiseases([row,...rows.filter(x=>x.id!==row.id)]);return row}
  const c=requireSupabase(),org=await orgId(c),pid=await optionalPatientIdFor(c,input),dep=await departmentId(c,org,input.department)
  const row={...input,id:input.id||`YDN-${Date.now()}`}
  const payload={id:String(row.id),organization_id:org,patient_id:pid,department_id:dep,disease:String(row.disease||''),deadline:String(row.deadline||''),diagnosis_date:date(row.diagnosisDate),declaration_date:date(row.declarationDate),status:String(row.status||'Προς δήλωση'),case_classification:String(row.caseClassification||''),physician:String(row.physician||''),notes:String(row.notes||''),data:rest(row,['id','patientId','patientCode','patientName','department','disease','deadline','diagnosisDate','declarationDate','status','caseClassification','physician','notes'])}
  const {data,error}=await c.from('notifiable_diseases').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name),patient:patients(id,patient_code,first_name,last_name)').single();if(error)throw error;const mapped=mapDisease(data);saveNotifiableDiseases([mapped,...loadNotifiableDiseases().filter(x=>String(x.id)!==String(mapped.id))]);return mapped
}
export async function deleteClinicalNotifiableDisease(id){
  if(!IS_PRODUCTION){saveNotifiableDiseases(loadNotifiableDiseases().filter(x=>String(x.id)!==String(id)));return true}
  const c=requireSupabase();const {error}=await c.from('notifiable_diseases').delete().eq('id',String(id));if(error)throw error;saveNotifiableDiseases(loadNotifiableDiseases().filter(x=>String(x.id)!==String(id)));return true
}

function mapSource(r){const e=one(r.employee),d=one(r.department);return {...r.data,id:r.id,sourceType:r.source_type,employeeId:r.employee_id||'',employeeName:e?[e.first_name,e.last_name].filter(Boolean).join(' '):'',employeeCode:e?.employee_code||'',department:d?.name||'',subjectName:r.subject_name||'',subjectCode:r.subject_code||'',sampleType:r.sample_type||'',sampleReason:r.sample_reason||'',collectionDate:r.collection_date||'',collectionTime:String(r.collection_time||'').slice(0,5),receivedDate:r.received_date||'',resultDate:r.result_date||'',status:r.status||'',resultStatus:r.status||'',microorganism:r.microorganism||'',resistance:r.resistance||'',sampleAcceptance:r.sample_acceptance||'Αποδεκτό',rejectionReason:r.rejection_reason||'',validatedAt:r.validated_at||'',validatedBy:r.data?.validatedBy||'',criticalResult:Boolean(r.critical_result),criticalCommunicatedTo:r.critical_communicated_to||'',criticalCommunicatedAt:r.critical_communicated_at||'',criticalCommunicatedBy:r.data?.criticalCommunicatedBy||''}}
function mapDisease(r){const p=one(r.patient),d=one(r.department);return {...r.data,id:r.id,patientId:r.patient_id||'',patientCode:p?.patient_code||'',patientName:[p?.first_name,p?.last_name].filter(Boolean).join(' '),department:d?.name||'',disease:r.disease,deadline:r.deadline,diagnosisDate:r.diagnosis_date||'',declarationDate:r.declaration_date||'',status:r.status,caseClassification:r.case_classification,physician:r.physician,notes:r.notes}}
function localSaveSource(r){return r.sourceType==='Προσωπικό'?upsertStaffSample(r):r.sourceType==='Περιβάλλον'?upsertEnvironmentalSample(r):upsertWaterRecord(r)}
function localDeleteSource(r){return r.sourceType==='Προσωπικό'?deleteStaffSample(r.id):r.sourceType==='Περιβάλλον'?deleteEnvironmentalSample(r.id):deleteWaterRecord(r.id)}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
async function patientIdFor(c,r){const id=await optionalPatientIdFor(c,r);if(!id)throw new Error('Patient must exist in the production registry.');return id}
async function optionalPatientIdFor(c,r){if(r.patientId){const {data}=await c.from('patients').select('id').eq('id',String(r.patientId)).maybeSingle();if(data?.id)return data.id}if(r.patientCode){const {data}=await c.from('patients').select('id').eq('patient_code',String(r.patientCode)).maybeSingle();if(data?.id)return data.id}return null}
async function employeeIdFor(c,r){if(r.employeeId)return String(r.employeeId);if(r.employeeCode){const {data}=await c.from('employees').select('id').eq('employee_code',String(r.employeeCode)).maybeSingle();return data?.id||null}return null}
function sourcePrefix(t){return t==='Προσωπικό'?'STAFF':t==='Περιβάλλον'?'ENV':'WATER'}
function date(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function time(v){const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}:00`:null}
function rest(o,keys){const x={...o};keys.forEach(k=>delete x[k]);return x}
function one(v){return Array.isArray(v)?v[0]:v}
