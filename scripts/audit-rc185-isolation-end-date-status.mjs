import fs from 'node:fs'
const backend=fs.readFileSync('src/services/backend/clinicalSupportBackendService.js','utf8')
const page=fs.readFileSync('src/pages/Patients/PatientWorkflowPage.jsx','utf8')
const editor=fs.readFileSync('src/pages/Patients/PatientWorkflowEditors.jsx','utf8')
const checks=[
 ['backend completes on end date <= today',backend.includes("row.endDate&&row.endDate<=today?'Ολοκληρωμένη':'Ενεργή'")],
 ['patient workflow save completes on same-day end',page.includes("isolationForm.endDate <= todayIso ? 'Ολοκληρωμένη' : 'Ενεργή'")],
 ['isolation editor badge completes on same-day end',editor.includes("form.endDate <= todayIso ? 'Ολοκληρωμένη' : 'Ενεργή'")],
 ['date patch recomputes same-day completion',editor.includes("<= todayIso ? 'Ολοκληρωμένη' : 'Ενεργή')")]
]
for(const [name,ok] of checks) console.log(ok?'PASS':'FAIL',name)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Isolation end-date status rc.185: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)
