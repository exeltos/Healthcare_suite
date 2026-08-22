import fs from 'node:fs'
const dir=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const sup=fs.readFileSync('src/services/backend/clinicalSupportBackendService.js','utf8')
const migration=fs.readFileSync('supabase/migrations/20260813_000010_clinical_relationship_integrity.sql','utf8')
const core=fs.readFileSync('supabase/migrations/20260813_000003_clinical_core.sql','utf8')
const checks=[
 ['patient_samples has first-class surveillance FK',/surveillance_case_id text references public\.surveillance_cases\(id\)/.test(core)],
 ['isolation has first-class surveillance FK migration',/alter table public\.patient_isolations[\s\S]*surveillance_case_id text references public\.surveillance_cases\(id\)/.test(migration)],
 ['sample relationship DB guard exists',/patient_samples_relationship_guard/.test(migration)],
 ['isolation relationship DB guard exists',/patient_isolations_relationship_guard/.test(migration)],
 ['sample fresh read-back verification',/verifiedSample[\s\S]*surveillance-case read-back verification/.test(dir)],
 ['sample parent/root relationship verification',/parent relationship verification[\s\S]*root relationship verification/.test(dir)],
 ['sample delete returns deleted row',/from\('patient_samples'\)[\s\S]*\.delete\(\)[\s\S]*\.select\('id'\)/.test(dir)],
 ['surveillance delete returns deleted row',/from\('surveillance_cases'\)[\s\S]*\.delete\(\)[\s\S]*\.select\('id'\)/.test(dir)],
 ['isolation save read-back verifies case',/Η σύνδεση απομόνωσης με την επιτήρηση δεν επιβεβαιώθηκε/.test(sup)],
 ['isolation production cache write is scoped',/withProductionCacheWrite\(\(\)=>upsertIsolation\(mapped\)\)/.test(sup)],
 ['isolation hydration cache writes are scoped',/if\(!patientId\)\{[\s\S]*withProductionCacheWrite/.test(sup)],
 ['isolation delete returns deleted row',/from\('patient_isolations'\)[\s\S]*\.delete\(\)[\s\S]*\.select\('id'\)/.test(sup)],
 ['production saves expose persisted marker',/return \{\.\.\.mapped,_persisted:true\}/.test(dir)&&/return \{\.\.\.mapped,_persisted:true\}/.test(sup)],
]
let fail=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}
console.log(`\nRC212 clinical write verification: ${checks.length-fail}/${checks.length} passed.`)
if(fail)process.exit(1)
