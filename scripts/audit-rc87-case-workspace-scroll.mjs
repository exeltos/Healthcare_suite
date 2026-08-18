import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const css=read('src/pages/Patients/PatientWorkflowPage.css')
const jsx=read('src/pages/Patients/PatientCaseSections.jsx')
const checks=[
 ['Case workspace has three target tabs',jsx.includes('Clinical assessment')&&jsx.includes('Samples')&&jsx.includes('Management')],
 ['Case workspace fills available patient body',css.includes('.pw-page-body > .pw-workspace')&&css.includes('height:100%')],
 ['Case hero stays fixed',css.includes('.pw-workspace > .pw-case-hero')&&css.includes('flex:0 0 auto')],
 ['Case tabs stay fixed',css.includes('.pw-workspace > .pw-workspace-tabs')&&css.includes('flex:0 0 auto')],
 ['Selected case section scrolls',css.includes('.pw-workspace > .pw-workspace-body')&&css.includes('overflow-y:auto !important')],
 ['Case body owns scroll instead of nested containers',css.includes('.pw-workspace-body > .pw-care-grid')&&css.includes('overflow:visible !important')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nrc.87 case workspace scroll audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
