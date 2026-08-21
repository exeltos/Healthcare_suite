import fs from 'node:fs'
const form=fs.readFileSync('src/components/core/FormActions/FormActions.jsx','utf8')
const bridge=fs.readFileSync('src/components/core/AppFeedbackBridge/AppFeedbackBridge.jsx','utf8')
const editor=fs.readFileSync('src/pages/Patients/PatientWorkflowEditors.jsx','utf8')
const page=fs.readFileSync('src/pages/Patients/PatientWorkflowPage.jsx','utf8')
const workflow=fs.readFileSync('src/services/clinicalWorkflowService.js','utf8')
const checks=[
 ['FormActions supports silent feedback',form.includes('feedback = true')&&form.includes('data-feedback-silent')],
 ['feedback bridge ignores silent submit/click',bridge.match(/data-feedback-silent/g)?.length>=2],
 ['sample editor disables inferred feedback',editor.includes('feedback={false}')],
 ['sample page requires persistedSample confirmation',page.includes('result?.persistedSample')],
 ['sample page shows Supabase-confirmed success',page.includes('Το δείγμα αποθηκεύτηκε στη Supabase.')],
 ['workflow reloads patient samples after backend save',workflow.includes('await loadClinicalPatientSamples(')],
 ['workflow throws if sample missing after save',workflow.includes('Supabase sample verification failed after save.')],
 ['workflow returns authoritative persisted sample',workflow.includes('return {...result,persistedSample}')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Sample confirmed feedback rc.180: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
