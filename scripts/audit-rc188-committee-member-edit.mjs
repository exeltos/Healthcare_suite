import fs from 'node:fs'
const ui=fs.readFileSync('src/pages/Organization/CommitteesPage.jsx','utf8')
const backend=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const checks=[
 ['member edit matches multiple stable identities',ui.includes('x.employeeId?`employee-${x.employeeId}`')&&ui.includes('x.relationalId')],
 ['role edit uses stable member identity',ui.includes("updateMember(m.employeeId||m.relationalId||m.id,{role:e.target.value})")],
 ['duties edit uses stable member identity',ui.includes("updateMember(m.employeeId||m.relationalId||m.id,{duties:e.target.value})")],
 ['UI verifies persisted role/duties',ui.includes('Committee member changes were not confirmed in Supabase.')],
 ['backend verifies relational member exists',backend.includes('Committee member relational verification failed.')],
 ['backend verifies relational member fields',backend.includes('Committee member relational field verification failed.')]
]
for(const [n,ok] of checks) console.log(ok?'PASS':'FAIL',n)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Committee member edit rc.188: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)
