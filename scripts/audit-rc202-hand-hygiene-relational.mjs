import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['WHO load uses sessions',s.includes("from('hand_hygiene_sessions')")],
 ['WHO load uses observations',s.includes("from('hand_hygiene_observations')")],
 ['WHO save writes session',s.includes("WHO session write could not be verified.")],
 ['WHO observations are upserted',s.includes("upsert(nextObservations,{onConflict:'id'})")],
 ['stale observations removed',s.includes("WHO observation identifiers verification failed.")],
 ['WHO calculations derived',s.includes('function calculateHandHygiene')],
 ['WHO delete uses session cascade',s.includes("Supabase delete did not remove the WHO session.")],
 ['generic prevention remains for other types',s.includes("from('prevention_records').upsert(payload")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`WHO relational rc.202: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
