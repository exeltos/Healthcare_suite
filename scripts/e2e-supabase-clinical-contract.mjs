#!/usr/bin/env node

/*
 * Healthcare Suite live Supabase clinical contract E2E.
 * Zero runtime dependencies: uses Node >=20 global fetch.
 *
 * Required env:
 *   E2E_SUPABASE_URL
 *   E2E_SUPABASE_PUBLISHABLE_KEY
 *   E2E_USER_A_EMAIL
 *   E2E_USER_A_PASSWORD
 *
 * Optional second tenant (required for cross-tenant RLS test):
 *   E2E_USER_B_EMAIL
 *   E2E_USER_B_PASSWORD
 *
 * This script NEVER uses a service-role key and only deletes records whose IDs
 * contain its unique HS-E2E run prefix.
 */

const env = process.env
const strict = process.argv.includes('--strict')
const required = ['E2E_SUPABASE_URL','E2E_SUPABASE_PUBLISHABLE_KEY','E2E_USER_A_EMAIL','E2E_USER_A_PASSWORD']
const missing = required.filter(k => !String(env[k] || '').trim())
if (strict) {
  for (const k of ['E2E_USER_B_EMAIL','E2E_USER_B_PASSWORD']) {
    if (!String(env[k] || '').trim()) missing.push(k)
  }
}
if (missing.length) {
  console.error(`E2E configuration missing: ${missing.join(', ')}`)
  console.error('Copy .env.e2e.example values into your shell/CI secret store and run again.')
  process.exit(2)
}

const base = String(env.E2E_SUPABASE_URL).replace(/\/$/, '')
const anon = String(env.E2E_SUPABASE_PUBLISHABLE_KEY)
const run = `HS-E2E-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const today = new Date().toISOString().slice(0,10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10)

const checks = []
const cleanup = []
function pass(name, detail='') { checks.push({name, ok:true, detail}); console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`) }
function fail(name, detail='') { checks.push({name, ok:false, detail}); console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
function expect(condition, name, detail='') { condition ? pass(name, detail) : fail(name, detail); return !!condition }

async function request(path, {token, method='GET', body, prefer, headers={}}={}) {
  const h = {
    apikey: anon,
    Authorization: `Bearer ${token || anon}`,
    'Content-Type':'application/json',
    ...headers,
  }
  if (prefer) h.Prefer = prefer
  const response = await fetch(`${base}${path}`, {method, headers:h, body:body === undefined ? undefined : JSON.stringify(body)})
  const text = await response.text()
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  return {ok:response.ok, status:response.status, data, text}
}

async function login(email,password) {
  const r = await request('/auth/v1/token?grant_type=password', {method:'POST', body:{email,password}})
  if (!r.ok || !r.data?.access_token) throw new Error(`Login failed for ${email}: ${r.status} ${r.text}`)
  return {token:r.data.access_token, user:r.data.user}
}
async function rpc(token,name,args={}) { return request(`/rest/v1/rpc/${name}`, {token,method:'POST',body:args}) }
async function orgId(token) {
  const r = await rpc(token,'current_organization_id')
  if (!r.ok || !r.data) throw new Error(`current_organization_id failed: ${r.status} ${r.text}`)
  return String(r.data)
}
async function insert(token,table,row) {
  return request(`/rest/v1/${table}`, {token,method:'POST',body:row,prefer:'return=representation'})
}
async function read(token,table,query) { return request(`/rest/v1/${table}?${query}`, {token}) }
async function remove(token,table,id) {
  return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {token,method:'DELETE',prefer:'return=representation'})
}
function first(r){ return Array.isArray(r.data) ? r.data[0] : null }
function id(suffix){ return `${run}-${suffix}` }

let A, B, orgA, orgB
try {
  A = await login(env.E2E_USER_A_EMAIL, env.E2E_USER_A_PASSWORD)
  orgA = await orgId(A.token)
  pass('User A authenticates and resolves organization', orgA)

  const hasB = Boolean(env.E2E_USER_B_EMAIL && env.E2E_USER_B_PASSWORD)
  if (hasB) {
    B = await login(env.E2E_USER_B_EMAIL, env.E2E_USER_B_PASSWORD)
    orgB = await orgId(B.token)
    expect(orgA !== orgB, 'E2E users belong to different organizations', `${orgA} vs ${orgB}`)
  } else {
    console.log('SKIP  Cross-tenant RLS scenario — E2E_USER_B_* not provided (allowed only outside --strict release mode)')
  }

  // Use null department intentionally: core RLS permits it and avoids coupling this test to master-data naming.
  const p1 = {
    id:id('P1'), organization_id:orgA, patient_code:id('CODE1'), amka:`E2E${Date.now()}`,
    first_name:'E2E', last_name:'PatientA', status:'Νοσηλεύεται', data:{e2e_run:run}
  }
  const p2 = {
    id:id('P2'), organization_id:orgA, patient_code:id('CODE2'), amka:`E2E${Date.now()+1}`,
    first_name:'E2E', last_name:'PatientB', status:'Νοσηλεύεται', data:{e2e_run:run}
  }

  let r = await insert(A.token,'patients',p1)
  if (!expect(r.ok && first(r)?.id===p1.id, 'Patient write returns authoritative row', `${r.status}`)) throw new Error(r.text)
  cleanup.push([A.token,'patients',p1.id])
  r = await read(A.token,'patients',`id=eq.${encodeURIComponent(p1.id)}&select=id,organization_id,amka`)
  expect(r.ok && first(r)?.organization_id===orgA, 'Patient fresh read-back persists in Supabase')

  r = await insert(A.token,'patients',p2)
  if (!expect(r.ok && first(r)?.id===p2.id, 'Second patient created for relationship guard tests')) throw new Error(r.text)
  cleanup.push([A.token,'patients',p2.id])

  r = await insert(A.token,'patients',{...p2,id:id('P-DUP-AMKA'),patient_code:id('CODE-DUP'),amka:p1.amka})
  expect(!r.ok, 'Duplicate non-empty AMKA rejected inside organization', `${r.status}`)

  const sc = {
    id:id('CASE1'),organization_id:orgA,patient_id:p1.id,status:'Αναμονή εργαστηρίου',workflow_phase:'awaiting-laboratory',laboratory_outcome:'pending',start_date:today,data:{e2e_run:run}
  }
  r = await insert(A.token,'surveillance_cases',sc)
  if (!expect(r.ok && first(r)?.patient_id===p1.id, 'Surveillance case created and linked to Patient A')) throw new Error(r.text)
  cleanup.push([A.token,'surveillance_cases',sc.id])

  const sample = {
    id:id('S1'),organization_id:orgA,patient_id:p1.id,surveillance_case_id:sc.id,root_sample_id:id('S1'),sample_type:'Αίμα',status:'Εκκρεμεί',collection_date:today,data:{e2e_run:run}
  }
  r = await insert(A.token,'patient_samples',sample)
  if (!expect(r.ok && first(r)?.surveillance_case_id===sc.id, 'Sample first-class surveillance relationship persists')) throw new Error(r.text)
  cleanup.push([A.token,'patient_samples',sample.id])

  const badSample = {...sample,id:id('S-BAD-PATIENT'),patient_id:p2.id,root_sample_id:id('S-BAD-PATIENT')}
  r = await insert(A.token,'patient_samples',badSample)
  expect(!r.ok, 'Cross-patient sample → surveillance_case link rejected by DB guard', `${r.status}`)

  const recheck = {
    ...sample,id:id('S2'),parent_sample_id:sample.id,root_sample_id:sample.id,status:'Εκκρεμεί',data:{e2e_run:run,recheck:true}
  }
  r = await insert(A.token,'patient_samples',recheck)
  if (!expect(r.ok && first(r)?.parent_sample_id===sample.id && first(r)?.root_sample_id===sample.id, 'Recheck parent/root relationships persist')) throw new Error(r.text)
  cleanup.push([A.token,'patient_samples',recheck.id])

  const infection = {
    id:id('INF1'),organization_id:orgA,patient_id:p1.id,surveillance_case_id:sc.id,related_sample_id:sample.id,status:'Υπό διερεύνηση',infection_type:'E2E',infection_date:today,microorganism:'E2E organism',data:{e2e_run:run}
  }
  r = await insert(A.token,'infections',infection)
  if (!expect(r.ok && first(r)?.related_sample_id===sample.id, 'Infection source sample and surveillance relationships persist')) throw new Error(r.text)
  cleanup.push([A.token,'infections',infection.id])

  const isolation = {
    id:id('ISO1'),organization_id:orgA,patient_id:p1.id,surveillance_case_id:sc.id,start_date:today,status:'Ενεργή',data:{e2e_run:run}
  }
  r = await insert(A.token,'patient_isolations',isolation)
  if (!expect(r.ok && first(r)?.surveillance_case_id===sc.id, 'Isolation first-class surveillance relationship persists')) throw new Error(r.text)
  cleanup.push([A.token,'patient_isolations',isolation.id])

  r = await insert(A.token,'patient_isolations',{...isolation,id:id('ISO-BAD-DATE'),end_date:yesterday})
  expect(!r.ok, 'Isolation end date before start date rejected by DB guard', `${r.status}`)

  if (B) {
    const pB = {id:id('PB'),organization_id:orgB,patient_code:id('CODEB'),first_name:'E2E',last_name:'TenantB',status:'Νοσηλεύεται',data:{e2e_run:run}}
    r = await insert(B.token,'patients',pB)
    if (r.ok) cleanup.push([B.token,'patients',pB.id])
    expect(r.ok, 'Tenant B control record can be created by Tenant B')

    r = await read(A.token,'patients',`id=eq.${encodeURIComponent(pB.id)}&select=id,organization_id`)
    expect(r.ok && Array.isArray(r.data) && r.data.length===0, 'Tenant A cannot read Tenant B patient through RLS')

    r = await insert(A.token,'patients',{id:id('CROSS-ORG'),organization_id:orgB,patient_code:id('CROSS-CODE'),first_name:'E2E',last_name:'CrossOrg',data:{e2e_run:run}})
    expect(!r.ok, 'Tenant A cannot write record into Tenant B organization', `${r.status}`)
  }

  // Delete a leaf record and prove authoritative deletion before parent cleanup.
  r = await remove(A.token,'patient_samples',recheck.id)
  expect(r.ok && first(r)?.id===recheck.id, 'Delete returns authoritative deleted sample row')
  cleanup.splice(cleanup.findIndex(x=>x[2]===recheck.id),1)
  r = await read(A.token,'patient_samples',`id=eq.${encodeURIComponent(recheck.id)}&select=id`)
  expect(r.ok && Array.isArray(r.data) && r.data.length===0, 'Deleted sample is absent on fresh Supabase read-back')

} catch (error) {
  fail('Live E2E runner completed without unexpected exception', error?.message || String(error))
} finally {
  // Reverse creation order. Ignore already-deleted records and preserve deterministic cleanup reporting.
  for (const [token,table,recordId] of [...cleanup].reverse()) {
    try {
      const r = await remove(token,table,recordId)
      if (!r.ok) console.error(`CLEANUP WARN ${table}/${recordId}: ${r.status} ${r.text}`)
    } catch (e) {
      console.error(`CLEANUP WARN ${table}/${recordId}: ${e?.message || e}`)
    }
  }
}

const failed = checks.filter(x=>!x.ok)
console.log(`\nHealthcare Suite live Supabase clinical contract: ${checks.length-failed.length}/${checks.length} PASS`)
console.log(`Run ID: ${run}`)
if (failed.length) process.exit(1)
