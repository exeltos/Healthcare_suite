import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['employee authority includes identity/category/department',s.includes("first_name,last_name,professional_category,department_id,department:departments(id,name)")],
 ['department snapshot comes from employee relation',s.includes("row.department=employeeDepartment?.name||''")],
 ['employee name snapshot comes from employee row',s.includes("row.employeeName=[employee.last_name,employee.first_name]")],
 ['professional category snapshot comes from employee row',s.includes("row.professionalCategory=employee.professional_category||''")],
 ['status canonicalized to recorded',s.includes("row.status='recorded'")],
 ['department column uses canonical department id',s.includes("department_id:resolvedDepartment")],
 ['read-back verifies snapshot department',s.includes("vaccination snapshot failed for department")],
 ['read-back verifies identity/category/vaccine/date',s.includes("vaccination snapshot failed for professional category")&&s.includes("vaccination snapshot failed for vaccine")&&s.includes("vaccination snapshot failed for date")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Vaccination data contract rc.175: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)
