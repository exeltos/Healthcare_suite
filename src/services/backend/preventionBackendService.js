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
 if(type==='promoted_antibiotic'){
   const org=await orgId(c)
   const {data,error}=await c.from('promoted_antibiotic_requests')
     .select('*,patient:patients(id,patient_code,first_name,last_name,department_id),department:departments(id,name)')
     .eq('organization_id',org)
     .order('request_date',{ascending:false})
     .order('created_at',{ascending:false})
   if(error)throw error
   const rows=(data||[]).map(mapPromotedAntibiotic)
   if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
   return rows
 }
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
 if(type==='antiseptic'){
   const org=await orgId(c)
   const {data,error}=await c.from('antiseptic_consumption_records')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org)
     .order('record_date',{ascending:false})
     .order('created_at',{ascending:false})
   if(error)throw error
   const rows=(data||[]).map(mapAntisepticConsumption)
   if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
   return rows
 }
 if(type==='waste'){
   const org=await orgId(c)
   const {data,error}=await c.from('waste_measurement_records')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org)
     .order('record_date',{ascending:false})
     .order('created_at',{ascending:false})
   if(error)throw error
   const rows=(data||[]).map(mapWasteMeasurement)
   if(JSON.stringify(d.load())!==JSON.stringify(rows))d.save(rows)
   return rows
 }
 if(type==='hand_hygiene'){
   const org=await orgId(c)
   const {data:sessions,error:sessionError}=await c.from('hand_hygiene_sessions')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org)
     .order('observation_date',{ascending:false})
     .order('created_at',{ascending:false})
   if(sessionError)throw sessionError
   const ids=(sessions||[]).map(x=>String(x.id))
   let observations=[]
   if(ids.length){
     const {data,error}=await c.from('hand_hygiene_observations')
       .select('*').eq('organization_id',org).in('session_id',ids)
       .order('created_at',{ascending:true})
     if(error)throw error
     observations=data||[]
   }
   const grouped=observations.reduce((map,item)=>{
     const key=String(item.session_id||'')
     if(!map.has(key))map.set(key,[])
     map.get(key).push(item)
     return map
   },new Map())
   const rows=(sessions||[]).map(row=>mapHandHygieneSession(row,grouped.get(String(row.id))||[]))
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

 if(type==='antiseptic'){
   const row={...input,id:input.id||`ANT-${Date.now()}`}
   const recordDate=normalizedDate(row.date)
   if(!recordDate)throw new Error('Antiseptic record date is required.')
   if(!String(row.product||'').trim())throw new Error('Antiseptic product is required.')
   const resolvedDepartment=await departmentId(c,org,row.department)

   const payload={
     id:String(row.id),
     organization_id:org,
     department_id:resolvedDepartment,
     record_date:recordDate,
     product:String(row.product||'').trim(),
     opening_stock:numberOrNull(row.openingStock),
     received:numberOrNull(row.received),
     closing_stock:numberOrNull(row.closingStock),
     consumption:numberOrNull(row.consumption),
     patient_days:numberOrNull(row.patientDays),
     responsible:String(row.responsible||''),
     notes:String(row.notes||''),
     legacy_prevention_record_id:String(row.legacyPreventionRecordId||row.legacyId||'').trim()||null,
   }

   const {data:existing,error:existingError}=await c.from('antiseptic_consumption_records')
     .select('id').eq('organization_id',org).eq('id',String(row.id)).maybeSingle()
   if(existingError)throw existingError

   let write=c.from('antiseptic_consumption_records')
   write=existing
     ? write.update(payload).eq('organization_id',org).eq('id',String(row.id))
     : write.insert(payload)

   const {data:saved,error}=await write
     .select('*,department:departments(id,name)').single()
   if(error)throw error

   const {data:verified,error:verifyError}=await c.from('antiseptic_consumption_records')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org).eq('id',String(saved.id)).maybeSingle()
   if(verifyError)throw verifyError
   if(!verified?.id)throw new Error('Supabase antiseptic write could not be verified.')

   const checks={
     record_date:recordDate,
     product:String(row.product||'').trim(),
     opening_stock:numberOrNull(row.openingStock),
     received:numberOrNull(row.received),
     closing_stock:numberOrNull(row.closingStock),
     consumption:numberOrNull(row.consumption),
     patient_days:numberOrNull(row.patientDays),
   }
   for(const [key,value] of Object.entries(checks)){
     if(String(verified[key]??'')!==String(value??''))throw new Error(`Antiseptic verification failed: ${key}.`)
   }

   const mapped=mapAntisepticConsumption(verified)
   await loadPreventionRecords(type)
   return {...mapped,_persisted:true}
 }

 if(type==='waste'){
   const row={...input,id:input.id||`WASTE-${Date.now()}`}
   const recordDate=normalizedDate(row.date)
   if(!recordDate)throw new Error('Waste measurement date is required.')
   if(!String(row.wasteType||'').trim())throw new Error('Waste type is required.')
   const resolvedDepartment=await departmentId(c,org,row.department)

   const payload={
     id:String(row.id),
     organization_id:org,
     department_id:resolvedDepartment,
     record_date:recordDate,
     waste_type:String(row.wasteType||'').trim(),
     weight_kg:numberOrNull(row.weightKg),
     containers:numberOrNull(row.containers),
     patient_days:numberOrNull(row.patientDays),
     responsible:String(row.responsible||''),
     document_number:String(row.documentNumber||''),
     collection_company:String(row.collectionCompany||''),
     notes:String(row.notes||''),
     legacy_prevention_record_id:String(row.legacyPreventionRecordId||row.legacyId||'').trim()||null,
   }

   const {data:existing,error:existingError}=await c.from('waste_measurement_records')
     .select('id').eq('organization_id',org).eq('id',String(row.id)).maybeSingle()
   if(existingError)throw existingError

   let write=c.from('waste_measurement_records')
   write=existing
     ? write.update(payload).eq('organization_id',org).eq('id',String(row.id))
     : write.insert(payload)

   const {data:saved,error}=await write
     .select('*,department:departments(id,name)').single()
   if(error)throw error

   const {data:verified,error:verifyError}=await c.from('waste_measurement_records')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org).eq('id',String(saved.id)).maybeSingle()
   if(verifyError)throw verifyError
   if(!verified?.id)throw new Error('Supabase waste write could not be verified.')

   const checks={
     record_date:recordDate,
     waste_type:String(row.wasteType||'').trim(),
     weight_kg:numberOrNull(row.weightKg),
     containers:numberOrNull(row.containers),
     patient_days:numberOrNull(row.patientDays),
     responsible:String(row.responsible||''),
     document_number:String(row.documentNumber||''),
     collection_company:String(row.collectionCompany||''),
   }
   for(const [key,value] of Object.entries(checks)){
     if(String(verified[key]??'')!==String(value??''))throw new Error(`Waste verification failed: ${key}.`)
   }

   const mapped=mapWasteMeasurement(verified)
   await loadPreventionRecords(type)
   return {...mapped,_persisted:true}
 }

 if(type==='promoted_antibiotic'){
   const row={...input}
   if(!row.patientId)throw new Error('Patient is required for a restricted-antibiotic request.')
   if(!row.antibiotic?.trim())throw new Error('Antibiotic is required.')
   const requestDate=date(row.date)
   if(!requestDate)throw new Error('Request date is required.')
   const {data:patient,error:patientError}=await c.from('patients')
     .select('id,patient_code,first_name,last_name,department_id')
     .eq('organization_id',org).eq('id',String(row.patientId)).maybeSingle()
   if(patientError)throw patientError
   if(!patient)throw new Error('Patient not found in the current organization.')
   const resolvedDepartment=await departmentId(c,org,row.department)
   const status=String(row.approval||row.status||'Εκκρεμεί')
   const isFinal=status==='Εγκρίθηκε'||status==='Απορρίφθηκε'||status==='Ακυρώθηκε'
   const payload={
     organization_id:org, patient_id:String(patient.id), department_id:resolvedDepartment||patient.department_id||null,
     antibiotic:String(row.antibiotic||'').trim(), indication:String(row.indication||''), request_date:requestDate,
     status, reviewed_by_name:isFinal?String(row.doctor||''):'', reviewed_at:isFinal?new Date().toISOString():null,
     approval_date:status==='Εγκρίθηκε'?date(row.approvalDate):null, decision_notes:String(row.notes||''),
   }
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(row.id||''))
   let saved,error
   if(uuid){
     ;({data:saved,error}=await c.from('promoted_antibiotic_requests').update(payload)
       .eq('organization_id',org).eq('id',String(row.id))
       .select('*,patient:patients(id,patient_code,first_name,last_name,department_id),department:departments(id,name)').single())
   }else{
     const legacyKey=String(row.id||'').trim()||null
     const insertPayload={...payload,legacy_prevention_record_id:legacyKey}
     ;({data:saved,error}=await c.from('promoted_antibiotic_requests').insert(insertPayload)
       .select('*,patient:patients(id,patient_code,first_name,last_name,department_id),department:departments(id,name)').single())
   }
   if(error)throw error
   const {data:verified,error:verifyError}=await c.from('promoted_antibiotic_requests')
     .select('*,patient:patients(id,patient_code,first_name,last_name,department_id),department:departments(id,name)')
     .eq('organization_id',org).eq('id',String(saved.id)).maybeSingle()
   if(verifyError)throw verifyError
   if(!verified?.id)throw new Error('Supabase restricted-antibiotic write could not be verified.')
   if(String(verified.patient_id)!==String(patient.id))throw new Error('Restricted-antibiotic patient verification failed.')
   if(String(verified.antibiotic)!==String(row.antibiotic||'').trim())throw new Error('Restricted-antibiotic verification failed.')
   if(String(verified.status)!==status)throw new Error('Restricted-antibiotic status verification failed.')
   const mapped=mapPromotedAntibiotic(verified)
   await loadPreventionRecords(type)
   return {...mapped,_persisted:true}
 }

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

 if(type==='hand_hygiene'){
   const row={...input,id:input.id||`WHO-${Date.now()}`}
   const observationDate=date(row.date||row.observationDate)
   if(!observationDate)throw new Error('WHO observation date is required.')
   const resolvedDepartment=await departmentId(c,org,row.department)
   const payload={
     id:String(row.id),
     organization_id:org,
     department_id:resolvedDepartment,
     observation_date:observationDate,
     facility:String(row.facility||''),
     ward:String(row.ward||''),
     observer:String(row.observer||''),
     start_time:time(row.startTime),
     end_time:time(row.endTime),
     notes:String(row.notes||''),
     legacy_prevention_record_id:String(row.legacyPreventionRecordId||row.legacyId||'').trim()||null,
   }
   const {data:existing,error:existingError}=await c.from('hand_hygiene_sessions')
     .select('id').eq('organization_id',org).eq('id',String(row.id)).maybeSingle()
   if(existingError)throw existingError

   let write=c.from('hand_hygiene_sessions')
   write=existing
     ? write.update(payload).eq('organization_id',org).eq('id',String(row.id))
     : write.insert(payload)
   const {data:saved,error}=await write
     .select('*,department:departments(id,name)').single()
   if(error)throw error

   const nextObservations=(Array.isArray(row.observations)?row.observations:[]).map((item,index)=>({
     id:String(item.id||`WHO-OBS-${Date.now()}-${index}`),
     session_id:String(saved.id),
     organization_id:org,
     professional_code:String(item.professionalCode||''),
     professional_category:String(item.professionalCategory||''),
     moment:String(item.moment||''),
     action:String(item.action||''),
     gloves:Boolean(item.gloves),
     notes:String(item.notes||''),
   }))

   const {data:existingObs,error:obsReadError}=await c.from('hand_hygiene_observations')
     .select('id').eq('organization_id',org).eq('session_id',String(saved.id))
   if(obsReadError)throw obsReadError
   const keep=new Set(nextObservations.map(x=>x.id))
   if(nextObservations.length){
     const {error:upsertObsError}=await c.from('hand_hygiene_observations')
       .upsert(nextObservations,{onConflict:'id'})
     if(upsertObsError)throw upsertObsError
   }
   const stale=(existingObs||[]).map(x=>String(x.id)).filter(id=>!keep.has(id))
   if(stale.length){
     const {error:deleteObsError}=await c.from('hand_hygiene_observations')
       .delete().eq('organization_id',org).eq('session_id',String(saved.id)).in('id',stale)
     if(deleteObsError)throw deleteObsError
   }

   const {data:verifiedSession,error:verifySessionError}=await c.from('hand_hygiene_sessions')
     .select('*,department:departments(id,name)')
     .eq('organization_id',org).eq('id',String(saved.id)).maybeSingle()
   if(verifySessionError)throw verifySessionError
   if(!verifiedSession?.id)throw new Error('WHO session write could not be verified.')

   const {data:verifiedObs,error:verifyObsError}=await c.from('hand_hygiene_observations')
     .select('*').eq('organization_id',org).eq('session_id',String(saved.id))
     .order('created_at',{ascending:true})
   if(verifyObsError)throw verifyObsError
   if((verifiedObs||[]).length!==nextObservations.length)
     throw new Error('WHO observations write could not be verified.')

   const expectedIds=[...keep].sort()
   const actualIds=(verifiedObs||[]).map(x=>String(x.id)).sort()
   if(JSON.stringify(expectedIds)!==JSON.stringify(actualIds))
     throw new Error('WHO observation identifiers verification failed.')

   const mapped=mapHandHygieneSession(verifiedSession,verifiedObs||[])
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

 if(type==='antiseptic'){
   const {data:deleted,error}=await c.from('antiseptic_consumption_records')
     .delete().eq('organization_id',org).eq('id',String(id)).select('id').maybeSingle()
   if(error)throw error
   if(!deleted?.id)throw new Error('Supabase delete did not remove the antiseptic record.')
   const {data:verified,error:verifyError}=await c.from('antiseptic_consumption_records')
     .select('id').eq('organization_id',org).eq('id',String(id)).maybeSingle()
   if(verifyError)throw verifyError
   if(verified)throw new Error('Supabase antiseptic delete could not be verified.')
   await loadPreventionRecords(type)
   return true
 }

 if(type==='waste'){
   const {data:deleted,error}=await c.from('waste_measurement_records')
     .delete().eq('organization_id',org).eq('id',String(id)).select('id').maybeSingle()
   if(error)throw error
   if(!deleted?.id)throw new Error('Supabase delete did not remove the waste record.')
   const {data:verified,error:verifyError}=await c.from('waste_measurement_records')
     .select('id').eq('organization_id',org).eq('id',String(id)).maybeSingle()
   if(verifyError)throw verifyError
   if(verified)throw new Error('Supabase waste delete could not be verified.')
   await loadPreventionRecords(type)
   return true
 }

 if(type==='promoted_antibiotic'){
   const {data:deleted,error}=await c.from('promoted_antibiotic_requests')
     .delete().eq('organization_id',org).eq('id',String(id)).select('id').maybeSingle()
   if(error)throw error
   if(!deleted?.id)throw new Error('Supabase delete did not remove the restricted-antibiotic request.')
   const {data:verified,error:verifyError}=await c.from('promoted_antibiotic_requests')
     .select('id').eq('organization_id',org).eq('id',String(id)).maybeSingle()
   if(verifyError)throw verifyError
   if(verified)throw new Error('Supabase restricted-antibiotic delete could not be verified.')
   await loadPreventionRecords(type)
   return true
 }

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

 if(type==='hand_hygiene'){
   const {data:deleted,error}=await c.from('hand_hygiene_sessions')
     .delete().eq('organization_id',org).eq('id',String(id)).select('id').maybeSingle()
   if(error)throw error
   if(!deleted?.id)throw new Error('Supabase delete did not remove the WHO session.')
   const {data:verified,error:verifyError}=await c.from('hand_hygiene_sessions')
     .select('id').eq('organization_id',org).eq('id',String(id)).maybeSingle()
   if(verifyError)throw verifyError
   if(verified)throw new Error('Supabase WHO session delete could not be verified.')
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
function mapPromotedAntibiotic(r={}){
 const patient=one(r.patient)||{}
 const department=one(r.department)||{}
 const legacy=String(r.legacy_prevention_record_id||'')
 return {
   id:r.id, legacyId:legacy, patientId:r.patient_id||'',
   patientName:[patient.first_name,patient.last_name].filter(Boolean).join(' '), patientCode:patient.patient_code||'',
   department:department.name||'', antibiotic:r.antibiotic||'', indication:r.indication||'', date:r.request_date||'',
   approval:r.status||'Εκκρεμεί', status:r.status||'Εκκρεμεί', doctor:r.reviewed_by_name||'',
   approvalDate:r.approval_date||'', notes:r.decision_notes||'', reviewedAt:r.reviewed_at||null,
   sourceType:legacy.startsWith('PTX-')?'patient-therapy':'', sourceId:legacy.startsWith('PTX-')?legacy.slice(4):'',
   createdAt:r.created_at||null, updatedAt:r.updated_at||null,
 }
}
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



function mapWasteMeasurement(r={}){
 const department=one(r.department)||{}
 const weight=numberOrNull(r.weight_kg)
 const patientDays=numberOrNull(r.patient_days)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.record_date||'',
   department:department.name||'',
   wasteType:r.waste_type||'',
   weightKg:r.weight_kg==null?'':String(r.weight_kg),
   containers:r.containers==null?'':String(r.containers),
   patientDays:r.patient_days==null?'':String(r.patient_days),
   indicator:patientDays&&weight!=null?weight/patientDays:0,
   responsible:r.responsible||'',
   documentNumber:r.document_number||'',
   collectionCompany:r.collection_company||'',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
function mapAntisepticConsumption(r={}){
 const department=one(r.department)||{}
 const consumption=numberOrNull(r.consumption)
 const patientDays=numberOrNull(r.patient_days)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.record_date||'',
   department:department.name||'',
   product:r.product||'',
   openingStock:r.opening_stock==null?'':String(r.opening_stock),
   received:r.received==null?'':String(r.received),
   closingStock:r.closing_stock==null?'':String(r.closing_stock),
   consumption:r.consumption==null?'':String(r.consumption),
   patientDays:r.patient_days==null?'':String(r.patient_days),
   indicator:patientDays&&consumption!=null?consumption/patientDays:0,
   responsible:r.responsible||'',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
function mapHandHygieneSession(r={},observations=[]){
 const department=one(r.department)||{}
 const mappedObservations=(observations||[]).map(item=>({
   id:item.id,
   relationalId:item.id,
   professionalCode:item.professional_code||'',
   professionalCategory:item.professional_category||'',
   moment:item.moment||'',
   action:item.action||'',
   gloves:Boolean(item.gloves),
   notes:item.notes||'',
 }))
 const calculations=calculateHandHygiene(mappedObservations)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.observation_date||'',
   department:department.name||'',
   facility:r.facility||'',
   ward:r.ward||'',
   observer:r.observer||'',
   startTime:trimTime(r.start_time),
   endTime:trimTime(r.end_time),
   notes:r.notes||'',
   observations:mappedObservations,
   calculations,
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
function calculateHandHygiene(observations=[]){
 const opportunities=observations.length
 const handRub=observations.filter(x=>x.action==='HR').length
 const handWash=observations.filter(x=>x.action==='HW').length
 const missed=observations.filter(x=>x.action==='MISSED').length
 const correctActions=handRub+handWash
 const professionals=new Set(observations.map(x=>x.professionalCode||x.professionalCategory).filter(Boolean)).size
 return {
   missed,handRub,handWash,
   compliance:opportunities?Math.round((correctActions/opportunities)*10000)/100:0,
   opportunities,professionals,correctActions,
 }
}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function normalizedDate(v){
 const s=String(v||'').trim()
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s
 const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
 return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null
}
function numberOrNull(v){
 const s=String(v??'').trim().replace(',','.')
 if(!s)return null
 const n=Number(s)
 return Number.isFinite(n)?n:null
}
function time(v){const s=String(v||'').trim();const m=s.match(/^(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}:00`:null}
function trimTime(v){return v?String(v).slice(0,5):''}
function one(v){return Array.isArray(v)?v[0]:v}
