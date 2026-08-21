import fs from 'node:fs'
const w=fs.readFileSync('src/services/clinicalWorkflowService.js','utf8')
const b=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const checks=[
 ['workflow persists mutated surveillance case',w.includes('persistedCase=await saveClinicalSurveillanceCase(caseToPersist)')],
 ['workflow verifies case exists after result',w.includes('Supabase surveillance-case verification failed after laboratory result.')],
 ['workflow verifies case status',w.includes('Surveillance case status verification failed after laboratory result.')],
 ['workflow verifies workflow phase',w.includes('Surveillance case workflow verification failed after laboratory result.')],
 ['workflow verifies lab outcome',w.includes('Surveillance case laboratory outcome verification failed after laboratory result.')],
 ['infection/sample link is verified',w.includes('Infection/sample link verification failed after laboratory result.')],
 ['workflow returns authoritative case/infection',w.includes('persistedCase,persistedInfection')],
 ['sample JSON excludes client createdAt/updatedAt',b.includes("'criticalCommunicatedAt','createdAt','updatedAt'")],
 ['infection JSON excludes client createdAt/updatedAt',b.includes("'resistance','createdAt','updatedAt'")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Positive case sync rc.183: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
