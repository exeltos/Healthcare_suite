import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadMasterData } from '../masterDataService'
import { deletePatient, loadPatientRegistry, savePatientRegistry, upsertPatient } from '../patientService'
import { deletePatientSample, loadPatientSamples, savePatientSamples, upsertPatientSample } from '../patientSamplesService'
import { deleteInfection, loadInfections, replaceInfections, upsertInfection } from '../infectionsService'
import { deleteSurveillanceCase, loadSurveillanceCases, replaceSurveillanceCases, upsertSurveillanceCase } from '../surveillanceCasesService'

export async function loadClinicalPatients(){
  if(!IS_PRODUCTION) return loadPatientRegistry()
  const client=requireSupabase()
  const { data,error }=await client.from('patients')
    .select('*,department:departments(id,name,code)')
    .order('last_name').order('first_name')
  if(error)throw error
  const rows=(data||[]).map(mapPatientFromDb)
  savePatientRegistry(rows,{emit:false})
  return rows
}

export async function saveClinicalPatient(input={}){
  if(!IS_PRODUCTION) return upsertPatient(input)
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const departmentId=await resolveDepartmentId(client,organizationId,input.department)
  const normalized={
    status:'Νοσηλεύεται',positiveCulture:false,mdr:false,isolation:false,...input,
    id:input.id||`patient-${Date.now()}`,
  }
  const payload={
    id:String(normalized.id),
    organization_id:organizationId,
    patient_code:String(normalized.patientCode||'').trim(),
    amka:emptyToNull(normalized.amka),
    first_name:String(normalized.firstName||'').trim(),
    last_name:String(normalized.lastName||'').trim(),
    father_name:String(normalized.fatherName||'').trim(),
    gender:String(normalized.gender||'').trim(),
    age:String(normalized.age??''),
    department_id:departmentId,
    room:String(normalized.room||''),
    admission_date:dateOrNull(normalized.admissionDate),
    admission_time:timeOrNull(normalized.admissionTime),
    discharge_date:dateOrNull(normalized.dischargeDate||normalized.exitDate),
    discharge_time:timeOrNull(normalized.dischargeTime),
    status:String(normalized.status||'Νοσηλεύεται'),
    primary_diagnosis:String(normalized.primaryDiagnosis||''),
    flags:{
      positiveCulture:Boolean(normalized.positiveCulture),
      mdr:Boolean(normalized.mdr),
      isolation:Boolean(normalized.isolation),
    },
    data:cleanData(normalized,[
      'id','patientCode','amka','firstName','lastName','fatherName','gender','age','department','room',
      'admissionDate','admissionTime','dischargeDate','exitDate','dischargeTime','status','primaryDiagnosis',
      'positiveCulture','mdr','isolation'
    ]),
  }
  if(!payload.patient_code) throw new Error('Patient code is required.')
  if(payload.amka){
    const {data:duplicateAmka,error:duplicateAmkaError}=await client.from('patients')
      .select('id,patient_code,first_name,last_name')
      .eq('organization_id',organizationId)
      .eq('amka',payload.amka)
      .neq('id',String(normalized.id))
      .limit(1)
    if(duplicateAmkaError)throw duplicateAmkaError
    if(duplicateAmka?.length)throw new Error('Υπάρχει ήδη ασθενής με το ίδιο ΑΜΚΑ.')
  }
  let query=client.from('patients')
  query=input.id?query.update(payload).eq('id',String(input.id)):query.insert(payload)
  const { data,error }=await query.select('*,department:departments(id,name,code)').single()
  if(error)throw error
  const row=mapPatientFromDb(data)
  await loadClinicalPatients()
  return row
}

export async function deleteClinicalPatient(recordOrId){
  if(!IS_PRODUCTION) return deletePatient(recordOrId)
  const id=typeof recordOrId==='object'?recordOrId?.id:recordOrId
  const client=requireSupabase()
  const { error }=await client.from('patients').delete().eq('id',String(id))
  if(error)throw error
  return loadClinicalPatients()
}

export async function loadClinicalSurveillanceCases(patientId=''){
  if(!IS_PRODUCTION){
    const rows=loadSurveillanceCases()
    return patientId?rows.filter(x=>String(x.patientKey||x.patientId)===String(patientId)):rows
  }
  const client=requireSupabase()
  let query=client.from('surveillance_cases').select('*,department:departments(id,name,code)').order('created_at',{ascending:false})
  if(patientId)query=query.eq('patient_id',String(patientId))
  const { data,error }=await query
  if(error)throw error
  const rows=(data||[]).map(mapCaseFromDb)
  if(!patientId) replaceSurveillanceCases(rows,{emit:false})
  else mergeCasesIntoCache(rows,patientId)
  return rows
}

export async function saveClinicalSurveillanceCase(input={}){
  if(!IS_PRODUCTION)return upsertSurveillanceCase(input)
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const patientId=await resolvePatientId(client,input.patientId||input.patientKey,input.patientCode)
  const {data:patientRow,error:patientError}=await client.from('patients')
    .select('id,department_id').eq('organization_id',organizationId).eq('id',String(patientId)).maybeSingle()
  if(patientError)throw patientError
  if(!patientRow)throw new Error('Patient not found in the current organization.')
  const row={...input,id:input.id||`CASE-${Date.now()}`,patientKey:patientId}
  validateClinicalAssessment(row.assessment)

  let initialSampleId=emptyToNull(row.initialSampleId)
  if(initialSampleId){
    const {data:sample,error:sampleError}=await client.from('patient_samples')
      .select('id,patient_id,surveillance_case_id,parent_sample_id,root_sample_id')
      .eq('organization_id',organizationId).eq('id',initialSampleId).maybeSingle()
    if(sampleError)throw sampleError
    if(!sample || String(sample.patient_id)!==String(patientId) || String(sample.surveillance_case_id||'')!==String(row.id))
      throw new Error('Initial sample must belong to the same patient and surveillance case.')
    if(sample.parent_sample_id || sample.root_sample_id)
      throw new Error('Initial sample cannot be a follow-up/recheck sample.')
  }

  const payload={
    id:String(row.id),organization_id:organizationId,patient_id:patientId,department_id:patientRow.department_id||null,
    status:String(row.status||'Αναμονή εργαστηρίου'),
    workflow_phase:String(row.workflowPhase||'awaiting-laboratory'),
    laboratory_outcome:String(row.laboratoryOutcome||'pending'),
    start_date:dateOrNull(row.startDate),closed_date:dateOrNull(row.closedDate),
    reason:String(row.reason||''),initial_sample_id:initialSampleId,
    data:cleanData(row,['id','patientKey','patientId','patientCode','department','status','workflowPhase','laboratoryOutcome','startDate','closedDate','reason','initialSampleId','createdAt','updatedAt']),
  }
  const { data,error }=await client.from('surveillance_cases').upsert(payload,{onConflict:'id'})
    .select('*,department:departments(id,name,code)').single()
  if(error)throw error
  if(String(data?.patient_id||'')!==String(patientId))throw new Error('Surveillance case patient verification failed.')
  if(String(data?.department_id||'')!==String(payload.department_id||''))throw new Error('Surveillance case department verification failed.')
  if(String(data?.initial_sample_id||'')!==String(initialSampleId||''))throw new Error('Surveillance case initial sample verification failed.')
  const mapped=mapCaseFromDb(data)
  await loadClinicalSurveillanceCases(patientId)
  return mapped
}

export async function deleteClinicalSurveillanceCase(id){
  if(!IS_PRODUCTION)return deleteSurveillanceCase(id)
  const client=requireSupabase()
  const { error }=await client.from('surveillance_cases').delete().eq('id',String(id))
  if(error)throw error
  return true
}

export async function loadClinicalPatientSamples(patientId=''){
  if(!IS_PRODUCTION){
    const rows=loadPatientSamples()
    return patientId?rows.filter(x=>String(x.patientId||'')===String(patientId)):rows
  }
  const client=requireSupabase()
  let query=client.from('patient_samples').select('*,department:departments(id,name,code),patient:patients(id,patient_code,first_name,last_name,admission_date)').order('created_at',{ascending:false})
  if(patientId)query=query.eq('patient_id',String(patientId))
  const { data,error }=await query
  if(error)throw error
  const base=(data||[]).map(mapSampleFromDb)
  const rows=await hydratePatientSampleLaboratoryResults(client,base)
  if(!patientId)savePatientSamples(rows,{emit:false})
  else mergeSamplesIntoCache(rows,patientId)
  return rows
}

export async function saveClinicalPatientSample(input={}){
  if(!IS_PRODUCTION)return upsertPatientSample(input)
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const patientId=await resolvePatientId(client,input.patientId,input.patientCode)
  const row={...input,id:input.id||`PS-${Date.now()}`,patientId}
  const caseId=emptyToNull(row.clinicalCaseId||row.surveillanceCaseId)
  let caseRow=null
  if(caseId){
    const {data,error}=await client.from('surveillance_cases')
      .select('id,patient_id,department_id,initial_sample_id')
      .eq('organization_id',organizationId).eq('id',caseId).maybeSingle()
    if(error)throw error
    if(!data)throw new Error('Surveillance case was not found in the current organization.')
    if(String(data.patient_id)!==String(patientId))throw new Error('Sample patient does not match the surveillance case.')
    caseRow=data
  }
  const canonicalMicroorganismResults=Array.isArray(row.microorganismResults)
    ? row.microorganismResults
        .map((item)=>({
          ...item,
          name:String(item?.name||item?.microorganism||'').trim(),
          resistance:String(item?.resistance||'').trim(),
        }))
        .filter((item)=>item.name)
    : []
  if(canonicalMicroorganismResults.length){
    row.microorganismResults=canonicalMicroorganismResults
    row.microorganisms=canonicalMicroorganismResults.map((item)=>item.name)
    row.microorganism=canonicalMicroorganismResults.map((item)=>item.name).join(', ')
    row.resistance=canonicalMicroorganismResults[0]?.resistance||row.resistance||''
  } else if(String(row.status||'')==='Αρνητικό'){
    row.microorganismResults=[]
    row.microorganisms=[]
    row.microorganism=''
    row.resistance=''
  }

  let departmentId=caseRow?.department_id||null
  if(!departmentId){
    const {data:patient,error:patientError}=await client.from('patients')
      .select('department_id').eq('organization_id',organizationId).eq('id',String(patientId)).maybeSingle()
    if(patientError)throw patientError
    departmentId=patient?.department_id||null
  }
  const payload={
    id:String(row.id),organization_id:organizationId,patient_id:patientId,
    surveillance_case_id:caseId,
    parent_sample_id:emptyToNull(row.parentSampleId),root_sample_id:emptyToNull(row.rootSampleId),
    sample_type:String(row.sampleType||''),category:String(row.category||''),
    sample_reason:String(row.sampleReason||''),collection_date:dateOrNull(row.collectionDate),
    collection_time:timeOrNull(row.collectionTime),received_date:dateOrNull(row.receivedDate),
    result_date:dateOrNull(row.resultDate),status:String(row.status||'Εκκρεμεί'),
    microorganism:String(row.microorganism||''),resistance:String(row.resistance||''),
    sample_acceptance:String(row.sampleAcceptance||'Αποδεκτό'),
    rejection_reason:String(row.rejectionReason||''),
    critical_result:Boolean(row.criticalResult),
    critical_communicated_to:String(row.criticalCommunicatedTo||''),
    department_id:departmentId,
    data:cleanData(row,['id','patientId','patientName','patientCode','department','clinicalCaseId','surveillanceCaseId','parentSampleId','rootSampleId','sampleType','category','sampleReason','collectionDate','collectionTime','receivedDate','resultDate','status','microorganism','resistance','sampleAcceptance','rejectionReason','validatedAt','criticalResult','criticalCommunicatedTo','criticalCommunicatedAt','createdAt','updatedAt']),
  }
  const {data:existingSample,error:existingSampleError}=await client.from('patient_samples')
    .select('id').eq('organization_id',organizationId).eq('id',String(row.id)).maybeSingle()
  if(existingSampleError)throw existingSampleError

  let sampleWrite=client.from('patient_samples')
  sampleWrite=existingSample
    ? sampleWrite.update(payload).eq('organization_id',organizationId).eq('id',String(row.id))
    : sampleWrite.insert(payload)

  const { data,error }=await sampleWrite
    .select('*,department:departments(id,name,code),patient:patients(id,patient_code,first_name,last_name,admission_date)').single()
  if(error)throw error
  if(String(data?.patient_id||'')!==String(patientId))throw new Error('Patient sample patient verification failed.')
  if(String(data?.department_id||'')!==String(departmentId||''))throw new Error('Patient sample department verification failed.')
  if(String(data?.surveillance_case_id||'')!==String(caseId||''))throw new Error('Patient sample surveillance-case verification failed.')

  await syncPatientSampleLaboratoryResults(client,{
    organizationId,
    sampleId:String(data.id),
    microorganismResults:Array.isArray(row.microorganismResults)?row.microorganismResults:[],
    antibiogram:Array.isArray(row.antibiogram)?row.antibiogram:[],
    fallbackMicroorganism:String(row.microorganism||''),
    fallbackResistance:String(row.resistance||''),
  })

  const isIndependentInitial=Boolean(caseRow)
    && !payload.parent_sample_id
    && !payload.root_sample_id
    && String(payload.category||'').trim()==='Αρχικό / νέο ανεξάρτητο δείγμα'

  if(isIndependentInitial && !caseRow.initial_sample_id){
    const {data:updatedCase,error:caseUpdateError}=await client.from('surveillance_cases')
      .update({initial_sample_id:String(data.id)})
      .eq('organization_id',organizationId).eq('id',caseId).eq('patient_id',patientId)
      .is('initial_sample_id',null)
      .select('id,initial_sample_id').maybeSingle()
    if(caseUpdateError)throw caseUpdateError
    if(updatedCase && String(updatedCase.initial_sample_id)!==String(data.id))
      throw new Error('Surveillance case initial sample link verification failed.')
  }

  const mapped=mapSampleFromDb(data)
  await Promise.all([
    loadClinicalPatientSamples(patientId),
    caseId?loadClinicalSurveillanceCases(patientId):Promise.resolve(),
  ])
  return mapped
}

export async function deleteClinicalPatientSample(id){
  if(!IS_PRODUCTION)return deletePatientSample(id)
  const client=requireSupabase()
  const { error }=await client.from('patient_samples').delete().eq('id',String(id))
  if(error)throw error
  return true
}

export async function loadClinicalInfections(patientId=''){
  if(!IS_PRODUCTION){
    const rows=loadInfections()
    return patientId?rows.filter(x=>String(x.patientId||'')===String(patientId)):rows
  }
  const client=requireSupabase()
  let query=client.from('infections').select('*,department:departments(id,name,code),patient:patients(id,patient_code,first_name,last_name,admission_date)').order('created_at',{ascending:false})
  if(patientId)query=query.eq('patient_id',String(patientId))
  const { data,error }=await query
  if(error)throw error
  const rows=(data||[]).map(mapInfectionFromDb)
  if(!patientId)replaceInfections(rows,{emit:false})
  else mergeInfectionsIntoCache(rows,patientId)
  return rows
}

export async function saveClinicalInfection(input={}){
  if(!IS_PRODUCTION)return upsertInfection(input)
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const patientId=await resolvePatientId(client,input.patientId,input.patientCode)
  const departmentId=await resolveDepartmentId(client,organizationId,input.department)
  const row={...input,id:input.id||`INF-${Date.now()}`,patientId}
  const payload={
    id:String(row.id),organization_id:organizationId,patient_id:patientId,
    surveillance_case_id:emptyToNull(row.clinicalCaseId),
    related_sample_id:emptyToNull(row.relatedSample||row.initialSampleId),
    department_id:departmentId,status:String(row.status||'Υπό διερεύνηση'),
    infection_type:String(row.infectionType||''),infection_date:dateOrNull(row.infectionDate||row.onsetDate),
    microorganism:String(row.microorganism||''),resistance:String(row.resistance||''),
    origin:String(row.origin||''),
    outcome:String(row.outcome||''),
    closure_reason:String(row.closureReason||''),
    completed_date:dateOrNull(row.completedDate),
    cancellation_date:dateOrNull(row.cancellationDate),
    cancellation_reason:String(row.cancellationReason||''),
    verification_status:String(row.verificationStatus||''),
    auto_created_from_laboratory:Boolean(row.autoCreatedFromLaboratory),
    data:cleanData(row,['id','patientId','patientName','patientCode','department','clinicalCaseId','relatedSample','initialSampleId','status','infectionType','infectionDate','onsetDate','microorganism','resistance','origin','outcome','closureReason','completedDate','cancellationDate','cancellationReason','verificationStatus','autoCreatedFromLaboratory','createdAt','updatedAt']),
  }
  const { data,error }=await client.from('infections').upsert(payload,{onConflict:'id'})
    .select('*,department:departments(id,name,code),patient:patients(id,patient_code,first_name,last_name,admission_date)').single()
  if(error)throw error
  const {data:verified,error:verifyError}=await client.from('infections')
    .select('*,department:departments(id,name,code),patient:patients(id,patient_code,first_name,last_name,admission_date)')
    .eq('organization_id',organizationId).eq('id',String(row.id)).maybeSingle()
  if(verifyError)throw verifyError
  if(!verified?.id)throw new Error('Supabase infection write could not be verified.')
  const expected={
    origin:String(row.origin||''),outcome:String(row.outcome||''),closure_reason:String(row.closureReason||''),
    completed_date:dateOrNull(row.completedDate),cancellation_date:dateOrNull(row.cancellationDate),
    cancellation_reason:String(row.cancellationReason||''),verification_status:String(row.verificationStatus||''),
    auto_created_from_laboratory:Boolean(row.autoCreatedFromLaboratory),
  }
  for(const [key,value] of Object.entries(expected)){
    if(String(verified[key]??'')!==String(value??''))throw new Error(`Supabase infection lifecycle verification failed: ${key}.`)
  }
  const mapped=mapInfectionFromDb(verified)
  await loadClinicalInfections(patientId)
  return {...mapped,_persisted:true}
}

export async function deleteClinicalInfection(id){
  if(!IS_PRODUCTION)return deleteInfection(id)
  const client=requireSupabase()
  const { error }=await client.from('infections').delete().eq('id',String(id))
  if(error)throw error
  return true
}

export async function hydrateClinicalPatient(patientOrId){
  const id=typeof patientOrId==='object'?patientOrId?.id:patientOrId
  if(!id)return null
  const patients=await loadClinicalPatients()
  const patient=patients.find(x=>String(x.id)===String(id))||null
  if(!patient)return null
  await Promise.all([
    loadClinicalSurveillanceCases(patient.id),
    loadClinicalPatientSamples(patient.id),
    loadClinicalInfections(patient.id),
  ])
  return patient
}


async function hydratePatientSampleLaboratoryResults(client,rows){
  if(!rows.length)return rows
  const ids=rows.map(row=>String(row.id))
  const {data:organisms,error:orgError}=await client.from('laboratory_sample_organisms')
    .select('*').in('patient_sample_id',ids).order('created_at')
  if(orgError)throw orgError
  const organismIds=(organisms||[]).map(item=>item.id)
  let antibiograms=[]
  if(organismIds.length){
    const {data,error}=await client.from('laboratory_antibiogram_results')
      .select('*').in('organism_result_id',organismIds).order('created_at')
    if(error)throw error
    antibiograms=data||[]
  }
  const orgBySample=(organisms||[]).reduce((map,item)=>{
    const key=String(item.patient_sample_id||'')
    if(!map.has(key))map.set(key,[])
    map.get(key).push(item)
    return map
  },new Map())
  const abByOrg=(antibiograms||[]).reduce((map,item)=>{
    const key=String(item.organism_result_id||'')
    if(!map.has(key))map.set(key,[])
    map.get(key).push(item)
    return map
  },new Map())
  return rows.map(row=>{
    const rel=orgBySample.get(String(row.id))||[]
    if(!rel.length)return row
    const microorganismResults=rel.map(item=>({
      id:item.id,
      relationalId:item.id,
      name:item.microorganism||'',
      resistance:item.resistance||'',
      isPrimary:!!item.is_primary,
    }))
    const primary=rel.find(item=>item.is_primary)||rel[0]
    const antibiogram=(abByOrg.get(String(primary?.id||''))||[]).map(item=>({
      id:item.id,
      relationalId:item.id,
      antibiotic:item.antibiotic||'',
      sensitivity:item.sensitivity||'',
      mic:item.mic||'',
    }))
    return {
      ...row,
      microorganismResults,
      microorganisms:microorganismResults.map(item=>item.name),
      microorganism:microorganismResults.map(item=>item.name).join(', '),
      resistance:primary?.resistance||row.resistance||'',
      antibiogram,
    }
  })
}

async function syncPatientSampleLaboratoryResults(client,{organizationId,sampleId,microorganismResults,antibiogram,fallbackMicroorganism,fallbackResistance}){
  const canonical=(microorganismResults||[])
    .map(item=>({
      id:item.relationalId||item.id||'',
      name:String(item.name||item.microorganism||'').trim(),
      resistance:String(item.resistance||'').trim(),
      isPrimary:Boolean(item.isPrimary),
    }))
    .filter(item=>item.name)
  if(!canonical.length && fallbackMicroorganism){
    canonical.push({id:'',name:fallbackMicroorganism,resistance:fallbackResistance||'',isPrimary:true})
  }
  if(canonical.length && !canonical.some(item=>item.isPrimary))canonical[0].isPrimary=true

  const {data:existing,error:readError}=await client.from('laboratory_sample_organisms')
    .select('*').eq('organization_id',organizationId).eq('patient_sample_id',sampleId)
  if(readError)throw readError
  const keep=new Set()
  let primarySaved=null

  for(const item of canonical){
    const current=(existing||[]).find(row=>
      (item.id&&String(row.id)===String(item.id))
      || String(row.microorganism||'').trim().toLocaleLowerCase('el-GR')===item.name.toLocaleLowerCase('el-GR')
    )
    const payload={
      organization_id:organizationId,
      patient_sample_id:sampleId,
      source_sample_id:null,
      microorganism:item.name,
      resistance:item.resistance,
      is_primary:!!item.isPrimary,
    }
    let saved
    if(current){
      const {data,error}=await client.from('laboratory_sample_organisms').update(payload).eq('id',current.id).select().single()
      if(error)throw error
      saved=data
    }else{
      const {data,error}=await client.from('laboratory_sample_organisms').insert(payload).select().single()
      if(error)throw error
      saved=data
    }
    keep.add(String(saved.id))
    if(saved.is_primary)primarySaved=saved
    item.relationalId=saved.id
  }

  for(const stale of (existing||[]).filter(row=>!keep.has(String(row.id)))){
    const {error}=await client.from('laboratory_sample_organisms').delete().eq('id',stale.id)
    if(error)throw error
  }

  if(!primarySaved && canonical.length){
    const {data,error}=await client.from('laboratory_sample_organisms')
      .select('*').eq('organization_id',organizationId).eq('patient_sample_id',sampleId).eq('is_primary',true).maybeSingle()
    if(error)throw error
    primarySaved=data
  }
  if(!primarySaved)return

  const {data:existingAb,error:abReadError}=await client.from('laboratory_antibiogram_results')
    .select('*').eq('organization_id',organizationId).eq('organism_result_id',primarySaved.id)
  if(abReadError)throw abReadError
  const abKeep=new Set()
  for(const item of (antibiogram||[]).filter(item=>String(item.antibiotic||'').trim())){
    const antibiotic=String(item.antibiotic||'').trim()
    const current=(existingAb||[]).find(row=>
      (item.relationalId&&String(row.id)===String(item.relationalId))
      || String(row.antibiotic||'').trim().toLocaleLowerCase('el-GR')===antibiotic.toLocaleLowerCase('el-GR')
    )
    const payload={
      organization_id:organizationId,
      organism_result_id:primarySaved.id,
      antibiotic,
      sensitivity:String(item.sensitivity||''),
      mic:String(item.mic||''),
    }
    let saved
    if(current){
      const {data,error}=await client.from('laboratory_antibiogram_results').update(payload).eq('id',current.id).select().single()
      if(error)throw error
      saved=data
    }else{
      const {data,error}=await client.from('laboratory_antibiogram_results').insert(payload).select().single()
      if(error)throw error
      saved=data
    }
    abKeep.add(String(saved.id))
  }
  for(const stale of (existingAb||[]).filter(row=>!abKeep.has(String(row.id)))){
    const {error}=await client.from('laboratory_antibiogram_results').delete().eq('id',stale.id)
    if(error)throw error
  }
}
function mapPatientFromDb(row={}){
  const department=one(row.department)
  const flags=row.flags||{}
  return {
    ...(row.data||{}),id:row.id,patientCode:row.patient_code||'',amka:row.amka||'',
    firstName:row.first_name||'',lastName:row.last_name||'',fatherName:row.father_name||'',
    fullName:[row.first_name,row.last_name].filter(Boolean).join(' '),gender:row.gender||'',age:row.age||'',
    department:department?.name||'',room:row.room||'',admissionDate:row.admission_date||'',
    admissionTime:trimTime(row.admission_time),dischargeDate:row.discharge_date||'',
    dischargeTime:trimTime(row.discharge_time),status:row.status||'',primaryDiagnosis:row.primary_diagnosis||'',
    positiveCulture:Boolean(flags.positiveCulture),mdr:Boolean(flags.mdr),isolation:Boolean(flags.isolation),
    createdAt:row.created_at||null,updatedAt:row.updated_at||null,
  }
}
function mapCaseFromDb(row={}){
  const department=one(row.department)
  return {...(row.data||{}),id:row.id,patientId:row.patient_id,patientKey:row.patient_id,
    department:department?.name||'',status:row.status||'',workflowPhase:row.workflow_phase||'',
    laboratoryOutcome:row.laboratory_outcome||'',startDate:row.start_date||'',closedDate:row.closed_date||'',
    reason:row.reason||'',initialSampleId:row.initial_sample_id||'',createdAt:row.created_at||null,updatedAt:row.updated_at||null}
}
function mapSampleFromDb(row={}){
  const department=one(row.department),patient=one(row.patient)
  return {...(row.data||{}),id:row.id,patientId:row.patient_id,
    patientCode:patient?.patient_code||row.data?.patientCode||'',
    patientName:[patient?.first_name,patient?.last_name].filter(Boolean).join(' ')||row.data?.patientName||'',
    admissionDate:patient?.admission_date||row.data?.admissionDate||'',department:department?.name||'',
    clinicalCaseId:row.surveillance_case_id||'',parentSampleId:row.parent_sample_id||'',rootSampleId:row.root_sample_id||'',
    sampleType:row.sample_type||'',category:row.category||'',sampleReason:row.sample_reason||'',
    collectionDate:row.collection_date||'',collectionTime:trimTime(row.collection_time),receivedDate:row.received_date||'',
    resultDate:row.result_date||'',status:row.status||'',microorganism:row.microorganism||'',resistance:row.resistance||'',
    sampleAcceptance:row.sample_acceptance||'Αποδεκτό',rejectionReason:row.rejection_reason||'',
    validatedAt:row.validated_at||'',validatedBy:row.data?.validatedBy||'',
    criticalResult:Boolean(row.critical_result),criticalCommunicatedTo:row.critical_communicated_to||'',
    criticalCommunicatedAt:row.critical_communicated_at||'',criticalCommunicatedBy:row.data?.criticalCommunicatedBy||'',
    createdAt:row.created_at||null,updatedAt:row.updated_at||null}
}
function mapInfectionFromDb(row={}){
  const department=one(row.department),patient=one(row.patient)
  return {...(row.data||{}),id:row.id,patientId:row.patient_id,
    patientCode:patient?.patient_code||row.data?.patientCode||'',
    patientName:[patient?.first_name,patient?.last_name].filter(Boolean).join(' ')||row.data?.patientName||'',
    admissionDate:patient?.admission_date||row.data?.admissionDate||'',department:department?.name||'',
    clinicalCaseId:row.surveillance_case_id||'',relatedSample:row.related_sample_id||'',
    status:row.status||'',infectionType:row.infection_type||'',infectionDate:row.infection_date||'',
    microorganism:row.microorganism||'',resistance:row.resistance||'',
    origin:row.origin??row.data?.origin??'',
    outcome:row.outcome??row.data?.outcome??'',
    closureReason:row.closure_reason??row.data?.closureReason??'',
    completedDate:row.completed_date??row.data?.completedDate??'',
    cancellationDate:row.cancellation_date??row.data?.cancellationDate??'',
    cancellationReason:row.cancellation_reason??row.data?.cancellationReason??'',
    verificationStatus:row.verification_status??row.data?.verificationStatus??'',
    autoCreatedFromLaboratory:row.auto_created_from_laboratory??row.data?.autoCreatedFromLaboratory??false,
    createdAt:row.created_at||null,updatedAt:row.updated_at||null}
}

function mergeCasesIntoCache(rows,patientId){
  replaceSurveillanceCases([...loadSurveillanceCases().filter(x=>String(x.patientKey||x.patientId)!==String(patientId)),...rows],{emit:false})
}
function mergeSamplesIntoCache(rows,patientId){
  savePatientSamples([...loadPatientSamples().filter(x=>String(x.patientId||'')!==String(patientId)),...rows],{emit:false})
}
function mergeInfectionsIntoCache(rows,patientId){
  replaceInfections([...loadInfections().filter(x=>String(x.patientId||'')!==String(patientId)),...rows],{emit:false})
}
async function currentOrganizationId(client){
  const {data,error}=await client.rpc('current_organization_id');if(error)throw error
  if(!data)throw new Error('Organization context not found.');return data
}
async function resolveDepartmentId(client,orgId,name){
  const clean=String(name||'').trim();if(!clean)return null
  const {data,error}=await client.from('departments').select('id').eq('organization_id',orgId).eq('name',clean).limit(1)
  if(error)throw error;return data?.[0]?.id||null
}
async function resolvePatientId(client,id,code){
  if(id){
    const {data,error}=await client.from('patients').select('id').eq('id',String(id)).maybeSingle()
    if(error)throw error;if(data?.id)return data.id
  }
  if(code){
    const {data,error}=await client.from('patients').select('id').eq('organization_id',await currentOrganizationId(client)).eq('patient_code',String(code)).maybeSingle()
    if(error)throw error;if(data?.id)return data.id
  }
  throw new Error('The patient must exist in the production patient registry before saving clinical data.')
}
function validateClinicalAssessment(assessment={}){
  const raw=String(assessment?.temperature??'').trim()
  if(raw){
    const temperature=Number(raw)
    if(!Number.isFinite(temperature) || temperature<30 || temperature>45)
      throw new Error('Temperature must be between 30 and 45 °C.')
  }
}
function cleanData(row,keys){const copy={...row};keys.forEach(k=>delete copy[k]);return copy}
function emptyToNull(v){const s=String(v??'').trim();return s||null}
function dateOrNull(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function timeOrNull(v){const s=String(v||'').trim();if(!s)return null;const m=s.match(/(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}:00`:null}
function trimTime(v){return v?String(v).slice(0,5):''}
function one(v){return Array.isArray(v)?v[0]:v}
