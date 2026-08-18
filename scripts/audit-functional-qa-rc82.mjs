import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const patientHome=read('src/pages/Patients/PatientHomeSections.jsx')
const patientUtils=read('src/pages/Patients/patientWorkflowUtils.js')
const patientCss=read('src/pages/Patients/PatientWorkflowPage.css')
const employees=read('src/pages/Employees/EmployeesPage.jsx')
const employeeWorkspace=read('src/pages/Employees/EmployeeWorkspacePage.jsx')
const userAccess=read('src/pages/Studio/UserAccessPage.jsx')
const launcher=read('src/components/launcher/NewEntryLauncher.jsx')
const flows=read('src/components/launcher/NewEntryLauncher.flows.jsx')
const parts=read('src/components/launcher/NewEntryLauncher.parts.jsx')
const newEntry=read('src/services/newEntryService.js')
const sidebar=read('src/components/layout/Sidebar.jsx')
const hand=read('src/pages/Prevention/HandHygienePage.jsx')

const environmentBlock=flows.slice(flows.indexOf('export function EnvironmentEntryFlow'))
const checks=[
 ['automatic hospital days utility',patientUtils.includes('calculateHospitalDays')],
 ['patient days read-only calculated',patientHome.includes('calculateHospitalDays(patient.admissionDate')],
 ['new patient cancel action',patientHome.includes('onCancelNew?.()')],
 ['patient workspace uses single application scroll container',patientCss.includes('.pw-page-body{padding:22px;min-height:0;overflow:visible}')&&patientCss.includes('.pw-page-shell{padding:18px')&&patientCss.includes('overflow:visible')],
 ['new employee opens full workspace',employees.includes("routeFor.employeeWorkspace('new')")],
 ['employee workspace supports new',employeeWorkspace.includes("isNewEmployee = String(employeeId) === 'new'")],
 ['new employee has cancel to registry',employeeWorkspace.includes("if(isNewEmployee){navigate(APP_ROUTES.EMPLOYEES);return}")],
 ['employee account editor closes after save',userAccess.includes("if(location.state?.fromEmployeeAccount)")],
 ['sidebar uses descendant return path',sidebar.includes('const navigationPath = returnPath || location.pathname')&&sidebar.includes('containsPath(item, navigationPath)')],
 ['WHO observer uses staff select',flows.includes("options={employeeOptions || []}")],
 ['WHO date uses native date control',flows.includes('type="date"')&&parts.includes("type = 'text'")],
 ['WHO time uses native time control',(flows.match(/type="time"/g)||[]).length>=2],
 ['WHO closes after successful save',launcher.includes("const isWho = selectedType?.id === 'hand-hygiene' || initialTypeId === 'hand-hygiene'")&&launcher.includes('resetAndClose()')],
 ['WHO calculations share one metric',hand.includes('calculateWhoCompliance')&&parts.includes('calculateWhoCompliance')],
 ['environment collection cannot enter laboratory result',!environmentBlock.includes('<span>Κατάσταση αποτελέσματος</span>')],
 ['environment collection cannot enter microorganism',!environmentBlock.includes('label="Μικροοργανισμός"')],
 ['environment persistence is pending-only',newEntry.includes("status: 'Εκκρεμεί'")&&newEntry.includes("microorganism: ''")&&newEntry.includes("acceptable: ''")],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nFunctional QA rc.82: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
