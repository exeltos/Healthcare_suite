import fs from 'node:fs'
const w=fs.readFileSync('src/services/clinicalWorkflowService.js','utf8')
const b=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const samplePos=w.indexOf("if(result?.sample) await saveClinicalPatientSample(result.sample)")
const casePos=w.indexOf("if(result?.surveillanceCase)", samplePos)
const checks=[
 ['sample persists before case update',samplePos>=0&&casePos>samplePos],
 ['workflow reloads authoritative cases after sample write',w.includes('await loadClinicalSurveillanceCases(patientId)')],
 ['backend sample write owns first initial-sample link',b.includes(".is('initial_sample_id',null)")],
 ['initial link requires independent initial category',b.includes("String(payload.category||'').trim()==='Αρχικό / νέο ανεξάρτητο δείγμα'")],
 ['backend verifies sample department',b.includes('Patient sample department verification failed.')],
 ['backend verifies sample case',b.includes('Patient sample surveillance-case verification failed.')],
 ['case still validates any explicit initial sample relationship',b.includes('Initial sample must belong to the same patient and surveillance case.')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(x=>x[1]).length
console.log(`Initial sample save-order rc.178: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
