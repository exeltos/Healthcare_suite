import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['vaccination employee loads department relation',s.includes("department:departments(id,name)")],
 ['vaccination inherits employee department id',s.includes("resolvedDepartment=employee.department_id")],
 ['vaccination inherits employee department name',s.includes("row.department=employeeDepartment.name")],
 ['vaccination gets explicit recorded status',s.includes("row.status='recorded'")],
 ['payload persists resolved department',s.includes("department_id:resolvedDepartment")],
 ['verification checks department',s.includes("vaccination verification failed for the department link")],
 ['verification checks status',s.includes("vaccination verification failed for status")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(x=>x[1]).length
console.log(`Vaccination persistence rc.172: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
