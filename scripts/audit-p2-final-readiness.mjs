import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const pkg=JSON.parse(read('package.json'))
const access=read('src/services/accessControlService.js')
const auth=read('src/services/auth/authService.js')
const notif=read('src/components/layout/NotificationCenter.jsx')
const help=read('src/components/help/helpContent.js')
const helpAdmin=read('src/components/help/helpContentAdmin.js')
const helpClinical=read('src/components/help/helpContentClinical.js')
const css=read('src/styles/app.css')
const patient=read('src/pages/Patients/PatientCaseSections.jsx')
const training=read('src/pages/Organization/TrainingPage.jsx')
const docs=read('src/pages/Organization/DocumentsPage.jsx')
const committees=read('src/pages/Organization/CommitteesPage.jsx')
const incidents=read('src/pages/Quality/IncidentsPage.jsx')
const capa=read('src/pages/Quality/CapaPage.jsx')
const risks=read('src/pages/Quality/RisksPage.jsx')
const governance=read('src/services/backend/governanceBackendService.js')
const lira=read('src/pages/Lira/LiraPage.jsx')
const indicators=read('src/pages/Quality/IndicatorsPage.jsx')
const checks=[
 ['Release version is a current release candidate',/^0\.12\.0-rc\.\d+$/.test(pkg.version)],
 ['Help version follows release',help.includes(`HELP_VERSION = '${pkg.version}'`)],
 ['Production authorization comes from server RPC',auth.includes("client.rpc('get_my_module_access')")],
 ['Department scoping remains centralized',access.includes('filterRowsByDepartmentScope')&&access.includes('canAccessDepartment')],
 ['Management Center is protected for Administrator',access.includes('PROTECTED_ROLE_RULES')&&access.includes("admin:'Πλήρης'")],
 ['Notification escalation policy remains active',notif.includes('escalation_after_hours')||governance.includes('escalation_after_hours')],
 ['Critical laboratory result closed loop remains surfaced',notif.includes('critical_lab_result')],
 ['Committee overdue action closed loop remains surfaced',notif.includes('committee_action_overdue')],
 ['Competency follow-up remains surfaced',notif.includes('competency_followup')],
 ['Training competency evidence guards remain active',training.includes('missingEvidence')&&training.includes('competentWithoutValidity')&&training.includes('retrainingWithoutPlan')],
 ['Controlled-document segregation of duties remains active',docs.includes('actor===preparer')&&docs.includes('actor===submitter')],
 ['Committee decision actions require owner/due date',committees.includes('incompleteActions')],
 ['Committee action completion evidence is recorded',committees.includes('completedAt')&&committees.includes('completedBy')],
 ['Incident closure blocks active/ineffective CAPA',incidents.includes('activeCapa.length')&&incidents.includes('ineffectiveCapa.length')],
 ['Severe incident closure requires investigation evidence',incidents.includes('rootCause')&&incidents.includes('lessonsLearned')],
 ['CAPA closure has effectiveness gate/evidence',capa.includes("effectivenessStatus!=='Αποτελεσματική'")&&capa.includes('closureVerified:true')],
 ['Risk closure has ownership/control guardrails',risks.includes('Assign a risk owner')&&risks.includes('Document implemented controls')],
 ['Patient editable care rows expose semantic clickability',patient.includes("!readOnly ? 'is-clickable' : ''")],
 ['Global interactive cursor contract remains active',css.includes('button:not(:disabled)')&&css.includes('[role="button"]')&&css.includes('cursor:pointer')],
 ['Help covers governance/clinical/quality workflows',helpAdmin.includes('Audit Trail')&&helpClinical.includes('Κρίσιμο αποτέλεσμα')&&helpAdmin.includes('Risk Register')],
 ['LIRA keeps evidence/data-quality model',lira.includes('LIRA')&&helpAdmin.includes('rule/evidence basis')],
 ['Indicators retain governed numerator/denominator model',indicators.includes('indicator')&&helpAdmin.includes('numerator/denominator')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nFINAL P2 readiness audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
