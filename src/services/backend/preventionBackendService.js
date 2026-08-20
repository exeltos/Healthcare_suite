import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import {
 loadAntisepticConsumption,saveAntisepticConsumption,loadWasteMeasurements,saveWasteMeasurements,
 loadPreventionAudits,savePreventionAudits,loadBundles,saveBundles,loadPromotedAntibiotics,savePromotedAntibiotics,
 loadStaffVaccinations,saveStaffVaccinations,loadHandHygieneSessions,saveHandHygieneSessions
} from '../preventionService'

const defs={
 antiseptic:{load:loadAntisepticConsumption,save:saveAntisepticConsumption},
 waste:{load:loadWasteMeasurements,save:saveWasteMeasurements},
 prevention_audit:{load:loadPreventionAudits,save:savePreventionAudits},
 bundle:{load:loadBundles,save:saveBundles},
 promoted_antibiotic:{load:loadPromotedAntibiotics,save:savePromotedAntibiotics},
 staff_vaccination:{load:loadStaffVaccinations,save:saveStaffVaccinations},
 hand_hygiene:{load:loadHandHygieneSessions,save:saveHandHygieneSessions},
}
export async function loadPreventionRecords(type){
 const d=defs[type];if(!d)throw new Error('Unknown prevention record type.')
 if(!IS_PRODUCTION)return d.load()
 const c=requireSupabase();const {data,error}=await c.from('prevention_records').select('*,department:departments(id,name)').eq('record_type',type).order('record_date',{ascending:false});if(error)throw error
 const rows=(data||[]).map(r=>({...r.data,id:r.id,department:one(r.department)?.name||r.data?.department||'',employeeId:r.employee_id||r.data?.employeeId||'',patientId:r.patient_id||r.data?.patientId||'',date:r.record_date||r.data?.date||'',status:r.status||r.data?.status||''}))
 if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
 return rows
}
export async function savePreventionRecord(type,input={}){
 const d=defs[type];if(!d)throw new Error('Unknown prevention record type.')
 if(!IS_PRODUCTION){const row={...input,id:input.id||`${type}-${Date.now()}`};d.save([row,...d.load().filter(x=>x.id!==row.id)]);return row}
 const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`${type}-${Date.now()}`}
 let resolvedDepartment=await departmentId(c,org,row.department),employee=null
 if(type==='staff_vaccination'&&row.employeeId){
   const {data:employeeRow,error:employeeError}=await c.from('employees').select('id,status,department_id,department:departments(id,name)').eq('organization_id',org).eq('id',String(row.employeeId)).maybeSingle()
   if(employeeError)throw employeeError
   employee=employeeRow
   if(!employee)throw new Error('Employee not found in the current organization.')
   if(employee.status==='inactive')throw new Error('Vaccination cannot be added to an inactive employee.')
   const employeeDepartment=one(employee.department)
   if(!resolvedDepartment&&employee.department_id)resolvedDepartment=employee.department_id
   if(!String(row.department||'').trim()&&employeeDepartment?.name)row.department=employeeDepartment.name
   if(!String(row.status||'').trim())row.status='recorded'
   const vaccinationDate=date(row.date)
   const {data:duplicate,error:duplicateError}=await c.from('prevention_records').select('id')
     .eq('organization_id',org).eq('record_type','staff_vaccination').eq('employee_id',String(row.employeeId))
     .eq('record_date',vaccinationDate).contains('data',{vaccine:row.vaccine}).neq('id',String(row.id)).limit(1)
   if(duplicateError)throw duplicateError
   if(duplicate?.length)throw new Error('The same vaccination is already recorded for this employee on this date.')
 }
 const payload={id:String(row.id),organization_id:org,record_type:type,department_id:resolvedDepartment,employee_id:row.employeeId?String(row.employeeId):null,patient_id:row.patientId?String(row.patientId):null,record_date:date(row.date||row.observationDate||row.startDate),status:String(row.status||row.approval||''),data:row}
 const {data,error}=await c.from('prevention_records').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error
 const {data:verified,error:verifyError}=await c.from('prevention_records').select('id,record_type,employee_id,department_id,record_date,status,data').eq('organization_id',org).eq('id',String(data.id)).eq('record_type',type).maybeSingle();if(verifyError)throw verifyError
 if(!verified)throw new Error('Supabase write could not be verified.')
 if(type==='staff_vaccination'&&row.employeeId&&String(verified.employee_id||'')!==String(row.employeeId))throw new Error('Supabase vaccination verification failed for the employee link.')
 if(type==='staff_vaccination'&&resolvedDepartment&&String(verified.department_id||'')!==String(resolvedDepartment))throw new Error('Supabase vaccination verification failed for the department link.')
 if(type==='staff_vaccination'&&String(verified.status||'')!=='recorded')throw new Error('Supabase vaccination verification failed for status.')
 await loadPreventionRecords(type);return {...row,id:verified.id,_persisted:true}
}
export async function deletePreventionRecord(type,id){
 const d=defs[type];if(!d)throw new Error('Unknown prevention record type.')
 if(!IS_PRODUCTION){d.save(d.load().filter(x=>String(x.id)!==String(id)));return true}
 const c=requireSupabase(),org=await orgId(c)
 const {data:deleted,error}=await c.from('prevention_records').delete().eq('organization_id',org).eq('id',String(id)).eq('record_type',type).select('id').maybeSingle();if(error)throw error
 if(!deleted?.id)throw new Error('Supabase delete did not remove a matching prevention record.')
 const {data:verified,error:verifyError}=await c.from('prevention_records').select('id').eq('organization_id',org).eq('id',String(id)).eq('record_type',type).maybeSingle();if(verifyError)throw verifyError
 if(verified)throw new Error('Supabase delete could not be verified.')
 await loadPreventionRecords(type);return true
}
export async function hydratePreventionBackend(){return Object.fromEntries(await Promise.all(Object.keys(defs).map(async type=>[type,await loadPreventionRecords(type)])))}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function one(v){return Array.isArray(v)?v[0]:v}
