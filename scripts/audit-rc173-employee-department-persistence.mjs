import fs from 'node:fs'
const ui=fs.readFileSync('src/pages/Employees/EmployeeWorkspaceSections.jsx','utf8')
const svc=fs.readFileSync('src/services/backend/directoryService.js','utf8')
const checks=[
 ['employee department LibraryField uses onChange',/libraryKey="departments" value=\{form\.department \|\| ''\} onChange=/.test(ui)],
 ['professional category LibraryField uses onChange',/libraryKey="professional-categories" value=\{form\.professionalCategory \|\| ''\} onChange=/.test(ui)],
 ['vaccination LibraryField uses onChange',/libraryKey="vaccines"[\s\S]{0,160}onChange=/.test(ui)],
 ['employee payload persists department_id',svc.includes('department_id:departmentId')],
 ['save returns department_id for verification',svc.includes('status,department_id,department:departments(id,name,code)')],
 ['department id read-back is verified',svc.includes('Employee department was not persisted correctly in Supabase.')],
 ['department name read-back is verified',svc.includes('Employee department verification failed after save.')],
]
for(const [name,ok] of checks) console.log(ok?'PASS':'FAIL',name)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Employee department persistence rc.173: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)
