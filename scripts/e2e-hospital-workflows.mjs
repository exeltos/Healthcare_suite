#!/usr/bin/env node

/*
 * Healthcare Suite live hospital workflow E2E.
 * Uses Node >=20 global fetch and normal authenticated users only.
 * No service-role key. No real patient/staff data.
 *
 * Required:
 *   E2E_SUPABASE_URL
 *   E2E_SUPABASE_PUBLISHABLE_KEY
 *   E2E_USER_A_EMAIL
 *   E2E_USER_A_PASSWORD
 *
 * Strict release mode also requires a second user in a different tenant:
 *   E2E_USER_B_EMAIL
 *   E2E_USER_B_PASSWORD
 */

import { randomUUID } from 'node:crypto'

const env=process.env
const strict=process.argv.includes('--strict')
const required=['E2E_SUPABASE_URL','E2E_SUPABASE_PUBLISHABLE_KEY','E2E_USER_A_EMAIL','E2E_USER_A_PASSWORD']
if(strict) required.push('E2E_USER_B_EMAIL','E2E_USER_B_PASSWORD')
const missing=required.filter(k=>!String(env[k]||'').trim())
if(missing.length){
  console.error(`E2E configuration missing: ${missing.join(', ')}`)
  console.error('Use .env.e2e.example values in your shell/CI secret store. No secrets belong in the repository.')
  process.exit(2)
}

const base=String(env.E2E_SUPABASE_URL).replace(/\/$/,'')
const anon=String(env.E2E_SUPABASE_PUBLISHABLE_KEY)
const run=`HS-E2E-WF-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const today=new Date().toISOString().slice(0,10)
const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10)
const checks=[]
const cleanup=[]

function pass(name,detail=''){checks.push({name,ok:true,detail});console.log(`PASS  ${name}${detail?` — ${detail}`:''}`)}
function fail(name,detail=''){checks.push({name,ok:false,detail});console.error(`FAIL  ${name}${detail?` — ${detail}`:''}`)}
function expect(condition,name,detail=''){condition?pass(name,detail):fail(name,detail);return Boolean(condition)}
function first(r){return Array.isArray(r.data)?r.data[0]:null}
function textId(suffix){return `${run}-${suffix}`}

async function request(path,{token,method='GET',body,prefer,headers={}}={}){
  const h={apikey:anon,Authorization:`Bearer ${token||anon}`,'Content-Type':'application/json',...headers}
  if(prefer)h.Prefer=prefer
  const response=await fetch(`${base}${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})
  const text=await response.text()
  let data=null
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  return {ok:response.ok,status:response.status,data,text}
}
async function login(email,password){
  const r=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}})
  if(!r.ok||!r.data?.access_token)throw new Error(`Login failed for ${email}: ${r.status} ${r.text}`)
  return {token:r.data.access_token,user:r.data.user}
}
async function rpc(token,name,args={}){return request(`/rest/v1/rpc/${name}`,{token,method:'POST',body:args})}
async function orgId(token){const r=await rpc(token,'current_organization_id');if(!r.ok||!r.data)throw new Error(`current_organization_id failed: ${r.status} ${r.text}`);return String(r.data)}
async function insert(token,table,row){return request(`/rest/v1/${table}`,{token,method:'POST',body:row,prefer:'return=representation'})}
async function update(token,table,query,row){return request(`/rest/v1/${table}?${query}`,{token,method:'PATCH',body:row,prefer:'return=representation'})}
async function read(token,table,query){return request(`/rest/v1/${table}?${query}`,{token})}
async function removeWhere(token,table,query){return request(`/rest/v1/${table}?${query}`,{token,method:'DELETE',prefer:'return=representation'})}
function addCleanup(token,table,query){cleanup.push([token,table,query])}

let A,B,orgA,orgB
try{
  A=await login(env.E2E_USER_A_EMAIL,env.E2E_USER_A_PASSWORD)
  orgA=await orgId(A.token)
  pass('Primary hospital test user authenticates',orgA)

  if(env.E2E_USER_B_EMAIL&&env.E2E_USER_B_PASSWORD){
    B=await login(env.E2E_USER_B_EMAIL,env.E2E_USER_B_PASSWORD)
    orgB=await orgId(B.token)
    expect(orgA!==orgB,'Two E2E users resolve to different hospital tenants',`${orgA} vs ${orgB}`)
  }else if(strict){
    throw new Error('Strict workflow E2E requires a second user in a different organization.')
  }

  // 1. CLINICAL: Patient -> Surveillance -> Lab -> Infection -> Recheck -> Isolation -> Closure.
  const patientId=textId('PATIENT')
  let r=await insert(A.token,'patients',{
    id:patientId,organization_id:orgA,patient_code:textId('PCODE'),amka:`E2EWF${Date.now()}`,
    first_name:'E2E',last_name:'Workflow',status:'Νοσηλεύεται',data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.id===patientId,'Clinical workflow: patient created with authoritative response',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'patients',`id=eq.${encodeURIComponent(patientId)}`)

  const caseId=textId('CASE')
  r=await insert(A.token,'surveillance_cases',{
    id:caseId,organization_id:orgA,patient_id:patientId,status:'Αναμονή εργαστηρίου',workflow_phase:'awaiting-laboratory',laboratory_outcome:'pending',start_date:today,data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.patient_id===patientId,'Clinical workflow: surveillance opened for patient'))throw new Error(r.text)
  addCleanup(A.token,'surveillance_cases',`id=eq.${encodeURIComponent(caseId)}`)

  const sampleId=textId('SAMPLE')
  r=await insert(A.token,'patient_samples',{
    id:sampleId,organization_id:orgA,patient_id:patientId,surveillance_case_id:caseId,root_sample_id:sampleId,
    sample_type:'Αίμα',status:'Θετικό',collection_date:today,data:{e2e_run:run,workflow:'initial'}
  })
  if(!expect(r.ok&&first(r)?.surveillance_case_id===caseId,'Clinical workflow: laboratory sample linked to surveillance'))throw new Error(r.text)
  addCleanup(A.token,'patient_samples',`id=eq.${encodeURIComponent(sampleId)}`)

  const infectionId=textId('INFECTION')
  r=await insert(A.token,'infections',{
    id:infectionId,organization_id:orgA,patient_id:patientId,surveillance_case_id:caseId,related_sample_id:sampleId,
    status:'Ενεργή',infection_type:'E2E workflow infection',infection_date:today,microorganism:'E2E organism',data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.related_sample_id===sampleId,'Clinical workflow: positive laboratory source links to infection'))throw new Error(r.text)
  addCleanup(A.token,'infections',`id=eq.${encodeURIComponent(infectionId)}`)

  const recheckId=textId('RECHECK')
  r=await insert(A.token,'patient_samples',{
    id:recheckId,organization_id:orgA,patient_id:patientId,surveillance_case_id:caseId,parent_sample_id:sampleId,root_sample_id:sampleId,
    sample_type:'Αίμα',status:'Αρνητικό',collection_date:today,data:{e2e_run:run,workflow:'recheck'}
  })
  if(!expect(r.ok&&first(r)?.parent_sample_id===sampleId&&first(r)?.root_sample_id===sampleId,'Clinical workflow: negative recheck preserves lineage'))throw new Error(r.text)
  addCleanup(A.token,'patient_samples',`id=eq.${encodeURIComponent(recheckId)}`)

  const isolationId=textId('ISOLATION')
  r=await insert(A.token,'patient_isolations',{
    id:isolationId,organization_id:orgA,patient_id:patientId,surveillance_case_id:caseId,start_date:today,status:'Ενεργή',data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.surveillance_case_id===caseId,'Clinical workflow: isolation linked to same surveillance'))throw new Error(r.text)
  addCleanup(A.token,'patient_isolations',`id=eq.${encodeURIComponent(isolationId)}`)

  r=await update(A.token,'patient_isolations',`id=eq.${encodeURIComponent(isolationId)}&organization_id=eq.${encodeURIComponent(orgA)}`,{end_date:today,status:'Ολοκληρωμένη'})
  expect(r.ok&&first(r)?.end_date===today,'Clinical workflow: isolation closes with end date')

  r=await update(A.token,'surveillance_cases',`id=eq.${encodeURIComponent(caseId)}&organization_id=eq.${encodeURIComponent(orgA)}`,{
    status:'Ολοκληρωμένη',workflow_phase:'closed',laboratory_outcome:'negative-follow-up',end_date:today
  })
  expect(r.ok&&first(r)?.status==='Ολοκληρωμένη','Clinical workflow: surveillance explicitly closes after follow-up')
  r=await read(A.token,'surveillance_cases',`id=eq.${encodeURIComponent(caseId)}&select=id,status,workflow_phase,laboratory_outcome,end_date`)
  expect(r.ok&&first(r)?.workflow_phase==='closed'&&first(r)?.laboratory_outcome==='negative-follow-up','Clinical workflow: closure survives fresh read-back')

  // 2. STAFF: employee -> occupational visit.
  const employeeId=randomUUID()
  r=await insert(A.token,'employees',{
    id:employeeId,organization_id:orgA,employee_code:textId('EMP'),first_name:'E2E',last_name:'Employee',professional_category:'Νοσηλευτής',status:'active',notes:run
  })
  if(!expect(r.ok&&first(r)?.id===employeeId,'Staff workflow: employee persists in hospital tenant'))throw new Error(r.text)
  addCleanup(A.token,'employees',`id=eq.${encodeURIComponent(employeeId)}`)

  const visitId=randomUUID()
  r=await insert(A.token,'employee_occupational_visits',{
    id:visitId,organization_id:orgA,employee_id:employeeId,visit_date:today,fitness:'Κατάλληλος',next_review_date:tomorrow,notes:run
  })
  if(!expect(r.ok&&first(r)?.employee_id===employeeId,'Staff workflow: occupational visit links to employee'))throw new Error(r.text)
  addCleanup(A.token,'employee_occupational_visits',`id=eq.${encodeURIComponent(visitId)}`)
  r=await read(A.token,'employee_occupational_visits',`id=eq.${encodeURIComponent(visitId)}&select=id,employee_id,visit_date,fitness`)
  expect(r.ok&&first(r)?.fitness==='Κατάλληλος','Staff workflow: occupational visit survives fresh read-back')

  // 3. WHO: session -> observation -> fresh read-back.
  const whoSessionId=textId('WHO')
  r=await insert(A.token,'hand_hygiene_sessions',{
    id:whoSessionId,organization_id:orgA,observation_date:today,facility:'E2E Hospital',ward:'E2E Ward',observer:'E2E Observer',notes:run
  })
  if(!expect(r.ok&&first(r)?.id===whoSessionId,'WHO workflow: observation session persists',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'hand_hygiene_sessions',`id=eq.${encodeURIComponent(whoSessionId)}`)

  const whoObsId=textId('WHO-OBS')
  r=await insert(A.token,'hand_hygiene_observations',{
    id:whoObsId,session_id:whoSessionId,organization_id:orgA,professional_code:'NUR',professional_category:'Νοσηλευτής',moment:'Πριν από επαφή με ασθενή',action:'Rub',gloves:false,notes:run
  })
  if(!expect(r.ok&&first(r)?.session_id===whoSessionId,'WHO workflow: observation links to WHO session',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'hand_hygiene_observations',`id=eq.${encodeURIComponent(whoObsId)}`)
  r=await read(A.token,'hand_hygiene_observations',`session_id=eq.${encodeURIComponent(whoSessionId)}&select=id,session_id,moment,action`)
  expect(r.ok&&Array.isArray(r.data)&&r.data.some(x=>x.id===whoObsId),'WHO workflow: session observations survive fresh read-back')

  // 4. QUALITY: incident -> CAPA -> effectiveness closure.
  const incidentId=textId('INC')
  r=await insert(A.token,'quality_incidents',{
    id:incidentId,organization_id:orgA,incident_date:today,title:'E2E quality incident',category:'E2E',status:'Νέα αναφορά',description:run,data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.id===incidentId,'Quality workflow: incident persists',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'quality_incidents',`id=eq.${encodeURIComponent(incidentId)}`)

  const capaId=textId('CAPA')
  r=await insert(A.token,'quality_capa',{
    id:capaId,organization_id:orgA,source_id:incidentId,source_type:'Συμβάν',title:'E2E corrective action',action_type:'Διορθωτική',due_date:tomorrow,
    progress:0,status:'Ανοικτή',planned_action:'E2E action',effectiveness_status:'Εκκρεμεί',data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.source_id===incidentId,'Quality workflow: CAPA links to source incident',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'quality_capa',`id=eq.${encodeURIComponent(capaId)}`)

  r=await update(A.token,'quality_capa',`id=eq.${encodeURIComponent(capaId)}&organization_id=eq.${encodeURIComponent(orgA)}`,{
    progress:100,status:'Ολοκληρωμένη',evidence:'E2E evidence',effectiveness_status:'Αποτελεσματική',effectiveness_date:today,effectiveness_notes:'Verified by E2E'
  })
  expect(r.ok&&Number(first(r)?.progress)===100&&first(r)?.effectiveness_status==='Αποτελεσματική','Quality workflow: CAPA closes with effectiveness evidence')
  r=await read(A.token,'quality_capa',`id=eq.${encodeURIComponent(capaId)}&select=id,source_id,progress,status,effectiveness_status,effectiveness_date`)
  expect(r.ok&&Number(first(r)?.progress)===100,'Quality workflow: CAPA closure survives fresh read-back')

  // 5. COMMITTEE: committee -> member -> meeting -> attendance; invalid outsider attendance must fail.
  const committeeId=textId('COMMITTEE')
  r=await insert(A.token,'committees',{
    id:committeeId,organization_id:orgA,name:`E2E Committee ${run.slice(-6)}`,committee_type:'Επιτροπή',status:'Ενεργή',member_ids:[],members:[],agenda:[],meetings:[],attachments:[],data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.id===committeeId,'Committee workflow: committee persists',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'committees',`id=eq.${encodeURIComponent(committeeId)}`)

  const memberId=randomUUID()
  r=await insert(A.token,'committee_members',{
    id:memberId,organization_id:orgA,committee_id:committeeId,employee_id:employeeId,full_name:'E2E Employee',role:'Μέλος',is_manual:false,is_active:true
  })
  if(!expect(r.ok&&first(r)?.committee_id===committeeId,'Committee workflow: registered employee becomes committee member'))throw new Error(r.text)
  addCleanup(A.token,'committee_members',`id=eq.${encodeURIComponent(memberId)}`)

  const meetingId=randomUUID()
  r=await insert(A.token,'committee_meetings',{
    id:meetingId,organization_id:orgA,committee_id:committeeId,meeting_date:today,status:'Οριστικοποιημένη',title:'E2E Meeting',notes:'E2E minutes'
  })
  if(!expect(r.ok&&first(r)?.committee_id===committeeId,'Committee workflow: meeting persists with minutes'))throw new Error(r.text)
  addCleanup(A.token,'committee_meetings',`id=eq.${encodeURIComponent(meetingId)}`)

  const attendeeId=randomUUID()
  r=await insert(A.token,'committee_meeting_attendees',{
    id:attendeeId,organization_id:orgA,meeting_id:meetingId,committee_member_id:memberId,employee_id:employeeId,full_name:'E2E Employee',role:'Μέλος',attendance_status:'Παρόν'
  })
  if(!expect(r.ok&&first(r)?.committee_member_id===memberId,'Committee workflow: attendance accepts actual committee member'))throw new Error(r.text)
  addCleanup(A.token,'committee_meeting_attendees',`id=eq.${encodeURIComponent(attendeeId)}`)

  r=await insert(A.token,'committee_meeting_attendees',{
    id:randomUUID(),organization_id:orgA,meeting_id:meetingId,committee_member_id:null,employee_id:null,full_name:'E2E Outsider',role:'Επισκέπτης',attendance_status:'Παρόν'
  })
  expect(!r.ok,'Committee workflow: outsider attendance is rejected by DB integrity guard',`${r.status}`)

  // 6. CONTROLLED DOCUMENTS: draft create/read/delete and duplicate code protection.
  const documentId=textId('DOC')
  const documentCode=`E2E-${Date.now()}`
  r=await insert(A.token,'controlled_documents',{
    id:documentId,organization_id:orgA,title:'E2E Controlled Document',code:documentCode,category:'E2E',version:'0.1',owner:'E2E',status:'Πρόχειρο',attachments:[],versions:[],data:{e2e_run:run}
  })
  if(!expect(r.ok&&first(r)?.id===documentId,'Documents workflow: controlled draft persists',`${r.status}`))throw new Error(r.text)
  addCleanup(A.token,'controlled_documents',`id=eq.${encodeURIComponent(documentId)}`)
  r=await read(A.token,'controlled_documents',`id=eq.${encodeURIComponent(documentId)}&select=id,code,status,version`)
  expect(r.ok&&first(r)?.status==='Πρόχειρο','Documents workflow: draft survives fresh read-back')
  r=await insert(A.token,'controlled_documents',{
    id:textId('DOC-DUP'),organization_id:orgA,title:'Duplicate E2E Document',code:documentCode,status:'Πρόχειρο',attachments:[],versions:[],data:{e2e_run:run}
  })
  expect(!r.ok,'Documents workflow: duplicate document code is rejected inside tenant',`${r.status}`)

  // 7. Tenant isolation touches workflow entities, not only patients.
  if(B){
    r=await read(B.token,'employees',`id=eq.${encodeURIComponent(employeeId)}&select=id,organization_id`)
    expect(r.ok&&Array.isArray(r.data)&&r.data.length===0,'Tenant isolation: second hospital cannot read first hospital employee')
    r=await read(B.token,'quality_incidents',`id=eq.${encodeURIComponent(incidentId)}&select=id,organization_id`)
    expect(r.ok&&Array.isArray(r.data)&&r.data.length===0,'Tenant isolation: second hospital cannot read first hospital quality incident')
    r=await read(B.token,'controlled_documents',`id=eq.${encodeURIComponent(documentId)}&select=id,organization_id`)
    expect(r.ok&&Array.isArray(r.data)&&r.data.length===0,'Tenant isolation: second hospital cannot read first hospital controlled document')
  }

  // Prove authoritative draft delete before generic cleanup.
  r=await removeWhere(A.token,'controlled_documents',`id=eq.${encodeURIComponent(documentId)}&organization_id=eq.${encodeURIComponent(orgA)}`)
  if(expect(r.ok&&first(r)?.id===documentId,'Documents workflow: draft delete returns authoritative row')){
    const i=cleanup.findIndex(x=>x[1]==='controlled_documents'&&x[2].includes(encodeURIComponent(documentId)))
    if(i>=0)cleanup.splice(i,1)
  }
  r=await read(A.token,'controlled_documents',`id=eq.${encodeURIComponent(documentId)}&select=id`)
  expect(r.ok&&Array.isArray(r.data)&&r.data.length===0,'Documents workflow: deleted draft is absent on fresh read-back')

}catch(error){
  fail('Hospital workflow runner completed without unexpected exception',error?.message||String(error))
}finally{
  for(const [token,table,query] of [...cleanup].reverse()){
    try{
      const r=await removeWhere(token,table,query)
      if(!r.ok)console.error(`CLEANUP WARN ${table}?${query}: ${r.status} ${r.text}`)
    }catch(error){console.error(`CLEANUP WARN ${table}?${query}: ${error?.message||error}`)}
  }
}

const failed=checks.filter(x=>!x.ok)
console.log(`\nHealthcare Suite hospital workflow E2E: ${checks.length-failed.length}/${checks.length} passed.`)
if(failed.length){
  console.error(`Failed checks: ${failed.map(x=>x.name).join(' | ')}`)
  process.exit(1)
}
if(strict&&(!B||orgA===orgB)){
  console.error('Strict release mode requires proven cross-tenant isolation with two different organizations.')
  process.exit(1)
}
process.exit(0)
