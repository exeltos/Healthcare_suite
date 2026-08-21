import fs from 'node:fs'
const backend=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const ui=fs.readFileSync('src/pages/Patients/PatientCaseSections.jsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20260821_000017_surveillance_initial_sample_department_hardening.sql','utf8')
const checks=[
 ['case derives department from patient row',backend.includes("select('id,department_id').eq('organization_id',organizationId).eq('id',String(patientId))")],
 ['case validates clinical temperature',backend.includes('validateClinicalAssessment(row.assessment)')],
 ['temperature backend range is 30-45',backend.includes('temperature<30 || temperature>45')],
 ['temperature input has min/max',ui.includes('min="30" max="45"')],
 ['initial sample must belong to same patient/case',backend.includes('Initial sample must belong to the same patient and surveillance case.')],
 ['initial sample cannot be follow-up',backend.includes('Initial sample cannot be a follow-up/recheck sample.')],
 ['sample loads canonical case department',backend.includes("select('id,patient_id,department_id,initial_sample_id')")],
 ['sample verifies patient/case/department after save',backend.includes('Patient sample department verification failed.')&&backend.includes('Patient sample surveillance-case verification failed.')],
 ['first independent sample links case only when null',backend.includes(".is('initial_sample_id',null)")],
 ['initial sample link is read-back verified',backend.includes('Surveillance case initial sample link verification failed.')],
 ['migration adds FK and safe unique-candidate backfill',migration.includes('candidate_count = 1')&&migration.includes('surveillance_cases_initial_sample_id_fkey')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(x=>x[1]).length
console.log(`Surveillance/sample data contract rc.177: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
