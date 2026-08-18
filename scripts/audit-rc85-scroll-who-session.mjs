import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const css=read('src/pages/Patients/PatientWorkflowPage.css')
const flows=read('src/components/launcher/NewEntryLauncher.flows.jsx')
const logic=read('src/components/launcher/NewEntryLauncher.logic.js')

const checks=[
 ['Patient tabs remain fixed',css.includes('.pw-patient-tabs{flex:none}')],
 ['Summary is its own scroll region',css.includes('.pw-patient-tab-body:has(> .pw-registry-strip)')&&css.includes('overflow-y:auto !important')],
 ['Standard patient lists scroll independently',css.includes('.pw-patient-tab-body > .pw-panel > .pw-record-list')&&css.includes('scrollbar-gutter:stable')],
 ['Care tab body itself does not scroll',css.includes('.pw-patient-tab-body:has(> .pw-care-grid)')&&css.includes('overflow:hidden !important')],
 ['Therapy and precautions columns are independent scroll regions',css.includes('.pw-care-card > .pw-record-list')&&css.includes('overflow-y:auto !important')],
 ['WHO add opportunity preserves professional identifier',flows.includes('professionalCode: whoObservation.professionalCode')],
 ['WHO add opportunity preserves professional category',flows.includes('professionalCategory: whoObservation.professionalCategory')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nrc.85 scroll/WHO session audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
