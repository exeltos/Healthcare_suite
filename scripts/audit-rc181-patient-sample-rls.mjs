import fs from 'node:fs'
const backend=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const sql=fs.readFileSync('supabase/migrations/20260821_000018_patient_sample_rls_workflow_alignment.sql','utf8')
const checks=[
 ['new sample path checks existing row',backend.includes("select('id').eq('organization_id',organizationId).eq('id',String(row.id)).maybeSingle()")],
 ['new sample uses insert when absent',backend.includes(': sampleWrite.insert(payload)')],
 ['existing sample uses scoped update',backend.includes("sampleWrite.update(payload).eq('organization_id',organizationId).eq('id',String(row.id))")],
 ['RLS select permits Patients or Laboratory',sql.includes("public.has_module_access('Ασθενείς',false)")&&sql.includes("public.has_module_access('Εργαστήριο',false)")],
 ['RLS insert permits Patients or Laboratory',sql.includes("create policy patient_samples_insert_scoped")&&sql.includes("public.has_module_access('Ασθενείς',true)")],
 ['non-lab insert must be pending',sql.includes("or status = 'Εκκρεμεί'")],
 ['RLS update remains Laboratory-controlled',sql.includes("create policy patient_samples_update_scoped")&&sql.includes("public.has_module_access('Εργαστήριο',true)")],
 ['delete permits Patients or Laboratory',sql.includes("create policy patient_samples_delete_scoped")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Patient sample RLS/workflow rc.181: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
