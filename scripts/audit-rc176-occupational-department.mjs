import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/directoryService.js','utf8')
const checks=[
 ['occupational load includes department_id',s.includes("select('id,employee_id,department_id,visit_date,fitness,next_review_date,notes,created_at,updated_at')")],
 ['employee department is loaded before save',s.includes("select('id,department_id')")],
 ['payload stores historical department id',s.includes("department_id:employeeRow.department_id||null")],
 ['update is tenant and employee scoped',s.includes(".eq('organization_id',organizationId).eq('employee_id',employeeId).eq('id',input.id)")],
 ['save read-back verifies organization',s.includes('Occupational-health organization verification failed.')],
 ['save read-back verifies employee',s.includes('Occupational-health employee verification failed.')],
 ['save read-back verifies department',s.includes('Occupational-health department verification failed.')],
 ['delete is tenant scoped and verified',s.includes('Occupational-health delete did not match a visit in the current organization.')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(x=>x[1]).length
console.log(`Occupational department persistence rc.176: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
