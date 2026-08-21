import fs from 'node:fs'
const page=fs.readFileSync('src/pages/Laboratory/LaboratoryWorkspacePage.jsx','utf8')
const backend=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const checks=[
 ['UI writes microorganisms array from canonical rows',page.includes("microorganisms: canonicalMicroorganisms.map((row) => row.name).filter(Boolean)")],
 ['UI joins canonical microorganism names',page.includes("microorganism: canonicalMicroorganisms.map((row) => row.name).filter(Boolean).join(', ')")],
 ['backend rebuilds microorganismResults',backend.includes('canonicalMicroorganismResults=Array.isArray(row.microorganismResults)')],
 ['backend rebuilds microorganisms snapshot',backend.includes('row.microorganisms=canonicalMicroorganismResults.map((item)=>item.name)')],
 ['backend rebuilds microorganism column source',backend.includes("row.microorganism=canonicalMicroorganismResults.map((item)=>item.name).join(', ')")],
 ['negative result clears microorganism snapshots',backend.includes("String(row.status||'')==='Αρνητικό'")&&backend.includes('row.microorganisms=[]')],
 ['backend no longer sends validated_at client value',!backend.includes('validated_at:row.validatedAt')],
 ['backend no longer sends critical communicated timestamp client value',!backend.includes('critical_communicated_at:row.criticalCommunicatedAt')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Lab snapshot/server time rc.182: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
