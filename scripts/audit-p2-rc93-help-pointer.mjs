import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const clinical=read('src/components/help/helpContentClinical.js')
const admin=read('src/components/help/helpContentAdmin.js')
const help=read('src/components/help/helpContent.js')
const center=read('src/components/help/HelpCenter.jsx')
const appCss=read('src/styles/app.css')
const btn=read('src/components/core/Button/Button.css')
const icon=read('src/components/core/IconButton/IconButton.css')
const patient=read('src/pages/Patients/PatientCaseSections.jsx')
const checks=[
 ['Help version is release-aligned',/HELP_VERSION = '0\.12\.0-rc\.\d+'/.test(help)],
 ['Patient help documents automatic hospital days and nested case tabs',clinical.includes('Ημέρες νοσηλείας υπολογίζονται αυτόματα')&&clinical.includes('Κλινική αξιολόγηση, Δείγματα και Αντιμετώπιση')],
 ['Employee help documents full new-employee workspace',clinical.includes('Νέος εργαζόμενος')&&clinical.includes('πλήρης καρτέλα')],
 ['Environmental help reserves results for Laboratory',clinical.includes('Δεν συμπληρώνετε μικροοργανισμό, CFU/ATP ή αποδοχή')&&clinical.includes('ιδιοκτησία της εργαστηριακής ροής')],
 ['Laboratory help documents critical-result closed loop',clinical.includes('Κρίσιμο αποτέλεσμα')&&clinical.includes('closed-loop')],
 ['WHO help documents professional-number retention and auto counting',clinical.includes('Αριθμός επαγγελματιών')&&clinical.includes('υπολογίζεται αυτόματα')&&clinical.includes('διατηρούνται')],
 ['Quality help covers Risk + CAPA effectiveness',admin.includes('Risk Register')&&admin.includes('effectiveness verification')],
 ['Indicator help covers numerator/denominator/provenance and stewardship',admin.includes("item('indicators'")&&admin.includes('numerator/denominator')&&admin.includes('Antimicrobial Stewardship')],
 ['Notification help covers escalation and read semantics',admin.includes("item('notifications'")&&admin.includes('Κλιμακωμένη')&&admin.includes('Όλες διαβασμένες')],
 ['Governance help covers audit/retention/continuity/privacy/competency',admin.includes("item('governance'")&&admin.includes('Audit Trail')&&admin.includes('RPO/RTO')&&admin.includes('GDPR')&&admin.includes('Κενά επάρκειας')],
 ['LIRA help covers evidence basis and data quality',admin.includes('rule/evidence basis')&&admin.includes('Ποιότητα δεδομένων')],
 ['Context inference includes governance, indicators, notifications',help.includes("return'governance'")&&help.includes("return'indicators'")&&help.includes("return'notifications'")],
 ['Help preview routes cover new topics',center.includes('indicators:APP_ROUTES.INDICATORS')&&center.includes('governance:APP_ROUTES.STUDIO_GOVERNANCE')],
 ['Global clickable contract covers buttons/links/role buttons/selects/pickers',appCss.includes('button:not(:disabled)')&&appCss.includes('a[href]')&&appCss.includes('[role="button"]')&&appCss.includes('select:not(:disabled)')&&appCss.includes('input[type="date"]:not(:disabled)')],
 ['Core Button shows pointer',btn.includes('cursor:pointer')],
 ['Core IconButton shows pointer',icon.includes('cursor:pointer')],
 ['Disabled controls do not show pointer',appCss.includes('cursor:not-allowed')],
 ['Patient editable care rows explicitly expose clickable semantics',patient.includes("!readOnly ? 'is-clickable' : ''")&&patient.includes('role={!readOnly ? "button" : undefined}')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nP2 rc.93 Help/Pointer audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
