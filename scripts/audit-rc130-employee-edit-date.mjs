import fs from 'node:fs'
const page=fs.readFileSync('src/pages/Employees/EmployeeWorkspacePage.jsx','utf8')
const sections=fs.readFileSync('src/pages/Employees/EmployeeWorkspaceSections.jsx','utf8')
const css=fs.readFileSync('src/pages/Employees/EmployeeWorkspacePage.css','utf8')
const checks=[
 ['background refresh preserves open edit form',page.includes('if(!(preserveDraft&&editingProfile)) setForm(next||{})')],
 ['employee event uses event payload',page.includes('Array.isArray(event.detail)?event.detail:loadAllEmployees()')],
 ['no directory refresh call from event handler',!page.includes('refreshEmployeeDirectory().catch')],
 ['employee date field uses ew Field geometry',sections.includes('function EmployeeDateField')&&sections.includes('<Field label={label}><input')],
 ['shared DateField import removed',!sections.includes("import { Button, DateField")],
 ['legacy rc128 date css removed',!css.includes('.ew-grid .core-field .core-control')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
if(failed)process.exit(1)
