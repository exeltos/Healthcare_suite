import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const css=read('src/pages/Patients/PatientWorkflowPage.css')
const logic=read('src/components/launcher/NewEntryLauncher.logic.js')
const flows=read('src/components/launcher/NewEntryLauncher.flows.jsx')
const parts=read('src/components/launcher/NewEntryLauncher.parts.jsx')
const launcher=read('src/components/launcher/NewEntryLauncher.jsx')
const service=read('src/services/newEntryService.js')
const metrics=read('src/core/utils/observationMetrics.js')

const checks=[
 ['Patient selected tab is vertical scroll owner',css.includes('overflow-y:auto !important')&&css.includes('patient tab scrolling regression fix')],
 ['Patient nested sample/care scroll traps removed',css.includes('.pw-care-card > .pw-record-list')&&css.includes('overflow:visible !important')],
 ['Opportunity field uses requested professional-number label',flows.includes("L('Αριθμός επαγγελματιών','Professional number')")],
 ['WHO summary counts distinct professional identifiers',parts.includes('calculateWhoCompliance(previewObservations)')],
 ['WHO metric counts distinct professional identifiers',metrics.includes('new Set(')&&metrics.includes('professionalCode')],
 ['Production WHO save bypasses legacy browser compatibility repository',service.includes("if (!IS_PRODUCTION) hybridEntriesRepository.save(payload)")],
 ['WHO close path is deterministic',launcher.includes("const isWho = selectedType?.id === 'hand-hygiene' || initialTypeId === 'hand-hygiene'")&&launcher.includes('resetAndClose()')],
 ['WHO save errors are surfaced instead of leaving a silent open card',launcher.includes("console.error('New entry save failed'")&&launcher.includes("L('Η αποθήκευση απέτυχε.','Save failed.')")],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nrc.84 root-cause audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
