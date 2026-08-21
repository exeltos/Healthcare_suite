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
 const c=requireSupabase()
 if(type==='staff_vaccination'){
   const org=await orgId(c)
   const {data,error}=await c.from('employee_vaccinations')
     .select('*,employee:employees(id,employee_code,first_name,last_name,professional_category,status,department_id,department:departments(id,name))')
     .eq('organization_id',org)
     .order('vaccination_date',{ascending:false})
     .order('created_at',{ascending:false})
   if(error)throw error
   const rows=(data||[]).map(mapEmployeeVaccination)
   if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
   return rows
 }
 const {data,error}=await c.from('prevention_records').select('*,department:departments(id,name)').eq('record_type',type).order('record_date',{ascending:false});if(error)throw error
 const rows=(data||[]).map(r=>({...r.data,id:r.id,department:one(r.department)?.name||r.data?.department||'',employeeId:r.employee_id||r.data?.employeeId||'',patientId:r.patient_id||r.data?.patientId||'',date:r.record_date||r.data?.date||'',status:r.status||r.data?.status||''}))
 if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
 return rows
}
export async function savePreventionRecord(type,input={}){
 const d=defs[type];if(!d)throw new Error('Unknown prevention record type.')
 if(!IS_PRODUCTION){const row={...input,id:input.id||`${type}-${Date.now()}`};d.save([row,...d.load().filter(x=>x.id!==row.id)]);return row}
 const c=requireSupabase(),org=await orgId(c)

 if(type==='staff_vaccination'){
   const row={...input}
   if(!row.employeeId)throw new Error('Employee is required for vaccination.')
   const vaccinationDate=date(row.date)
   if(!vaccinationDate)throw new Error('Vaccination date is required.')

   const {data:employee,error:employeeError}=await c.from('employees')
     .select('id,status,first_name,last_name,professional_category,department_id,department:departments(id,name)')
     .eq('organization_id',org).eq('id',String(row.employeeId)).maybeSingle()
   if(employeeError)throw employeeError
   if(!employee)throw new Error('Employee not found in the current organization.')
   if(employee.status==='inactive')throw new Error('Vaccination cannot be added to an inactive employee.')

   const employeeDepartment=one(employee.department)
   const duplicateQuery=c.from('employee_vaccinations').select('id')
     .eq('organization_id',org)
     .eq('employee_id',String(row.employeeId))
     .eq('vaccination_date',vaccinationDate)
     .ilike('vaccine',String(row.vaccine||'').trim())
   const {data:duplicates,error:duplicateError}=row.id
     ? await duplicateQuery.neq('id',String(row.id)).limit(1)
     : await duplicateQuery.limit(1)
   if(duplicateError)throw duplicateError
   if(duplicates?.length)throw new Error('The same vaccination is already recorded for this employee on this date.')

   const payload={
     organization_id:org,
     employee_id:String(row.employeeId),
     department_id:employee.department_id||null,
     vaccine:String(row.vaccine||'').trim(),
     dose:String(row.dose||''),
     vaccination_date:vaccinationDate,
     next_due_date:date(row.validUntil),
     lot_number:String(row.lot||''),
     provider:String(row.provider||''),
     status:String(row.status||'Ολοκληρωμένος'),
     notes:String(row.notes||''),
   }

   let write=c.from('employee_vaccinations')
   write=row.id
     ? write.update(payload).eq('organization_id',org).eq('id',String(row.id))
     : write.insert(payload)
   const {data:saved,error}=await write
     .select('*,employee:employees(id,employee_code,first_name,last_name,professional_category,status,department_id,department:departments(id,name))')
     .single()
   if(error)throw error

   const {data:verified,error:verifyError}=await c.from('employee_vaccinations')
     .select('*,employee:employees(id,employee_code,first_name,last_name,professional_category,status,department_id,department:departments(id,name))')
     .eq('organization_id',org).eq('id',String(saved.id)).maybeSingle()
   if(verifyError)throw verifyError
   if(!verified?.id)throw new Error('Supabase vaccination write could not be verified.')
   if(String(verified.employee_id||'')!==String(row.employeeId))throw new Error('Supabase vaccination employee verification failed.')
   if(String(verified.vaccine||'')!==String(row.vaccine||'').trim())throw new Error('Supabase vaccination vaccine verification failed.')
   if(String(verified.vaccination_date||'')!==vaccinationDate)throw new Error('Supabase vaccination date verification failed.')
   if(String(verified.dose||'')!==String(row.dose||''))throw new Error('Supabase vaccination dose verification failed.')
   if(String(verified.lot_number||'')!==String(row.lot||''))throw new Error('Supabase vaccination lot verification failed.')
   if(String(verified.next_due_date||'')!==String(date(row.validUntil)||''))throw new Error('Supabase vaccination validity verification failed.')

   const mapped=mapEmployeeVaccination(verified)
   await loadPreventionRecords(type)
   return {...mapped,_persisted:true}
 }

 const row={...input,id:input.id||`${type}-${Date.now()}`}
 const resolvedDepartment=await departmentId(c,org,row.department)
 const payload={id:String(row.id),organization_id:org,record_type:type,department_id:resolvedDepartment,employee_id:row.employeeId?String(row.employeeId):null,patient_id:row.patientId?String(row.patientId):null,record_date:date(row.date||row.observationDate||row.startDate),status:String(row.status||row.approval||''),data:row}
 const {data,error}=await c.from('prevention_records').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error
 const {data:verified,error:verifyError}=await c.from('prevention_records').select('id,record_type,employee_id,department_id,record_date,status,data').eq('organization_id',org).eq('id',String(data.id)).eq('record_type',type).maybeSingle();if(verifyError)throw verifyError
 if(!verified)throw new Error('Supabase write could not be verified.')
 await loadPreventionRecords(type);return {...row,id:verified.id,_persisted:true}
}
export async function deletePreventionRecord(type,id){
 const d=defs[type];if(!d)throw new Error('Unknown prevention record type.')
 if(!IS_PRODUCTION){d.save(d.load().filter(x=>String(x.id)!==String(id)));return true}
 const c=requireSupabase(),org=await orgId(c)

 if(type==='staff_vaccination'){
   const {data:deleted,error}=await c.from('employee_vaccinations')
     .delete().eq('organization_id',org).eq('id',String(id)).select('id').maybeSingle()
   if(error)throw error
   if(!deleted?.id)throw new Error('Supabase delete did not remove the vaccination record.')
   const {data:verified,error:verifyError}=await c.from('employee_vaccinations')
     .select('id').eq('organization_id',org).eq('id',String(id)).maybeSingle()
   if(verifyError)throw verifyError
   if(verified)throw new Error('Supabase vaccination delete could not be verified.')
   await loadPreventionRecords(type)
   return true
 }

 const {data:deleted,error}=await c.from('prevention_records').delete().eq('organization_id',org).eq('id',String(id)).eq('record_type',type).select('id').maybeSingle();if(error)throw error
 if(!deleted?.id)throw new Error('Supabase delete did not remove a matching prevention record.')
 const {data:verified,error:verifyError}=await c.from('prevention_records').select('id').eq('organization_id',org).eq('id',String(id)).eq('record_type',type).maybeSingle();if(verifyError)throw verifyError
 if(verified)throw new Error('Supabase delete could not be verified.')
 await loadPreventionRecords(type);return true
}
export async function hydratePreventionBackend(){return Object.fromEntries(await Promise.all(Object.keys(defs).map(async type=>[type,await loadPreventionRecords(type)])))}
function mapEmployeeVaccination(r={}){
 const employee=one(r.employee)
 const department=one(employee?.department)
 return {
   id:r.id,
   employeeId:r.employee_id||'',
   employeeName:[employee?.last_name,employee?.first_name].filter(Boolean).join(' '),
   employeeCode:employee?.employee_code||'',
   department:department?.name||'',
   professionalCategory:employee?.professional_category||'',
   vaccine:r.vaccine||'',
   dose:r.dose||'',
   date:r.vaccination_date||'',
   validUntil:r.next_due_date||'',
   lot:r.lot_number||'',
   provider:r.provider||'',
   status:r.status||'Ολοκληρωμένος',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function one(v){return Array.isArray(v)?v[0]:v}
