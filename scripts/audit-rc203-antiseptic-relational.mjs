import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['load antiseptic relational',s.includes("from('antiseptic_consumption_records')")],
 ['save antiseptic relational',s.includes("Supabase antiseptic write could not be verified.")],
 ['numeric fields verified',s.includes("Antiseptic verification failed: ${key}.")],
 ['indicator derived',s.includes('consumption/patientDays')],
 ['delete antiseptic relational',s.includes('Supabase delete did not remove the antiseptic record.')],
 ['generic prevention remains',s.includes("from('prevention_records').upsert(payload")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Antiseptic relational rc.203: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
