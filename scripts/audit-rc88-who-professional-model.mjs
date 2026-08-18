import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const logic=read('src/components/launcher/NewEntryLauncher.logic.js')
const flows=read('src/components/launcher/NewEntryLauncher.flows.jsx')
const parts=read('src/components/launcher/NewEntryLauncher.parts.jsx')
const metrics=read('src/core/utils/observationMetrics.js')
const service=read('src/services/newEntryService.js')

const checks=[
 ['No separate manual professional-count state',!logic.includes('professionalCount')&&!service.includes('whoSession.professionalCount')],
 ['Requested professional-number label remains the opportunity/session working key',flows.includes("L('Αριθμός επαγγελματιών','Professional number')")],
 ['Adding an opportunity keeps the current professional identifier',flows.includes('professionalCode: whoObservation.professionalCode')],
 ['Adding an opportunity keeps professional category',flows.includes('professionalCategory: whoObservation.professionalCategory')],
 ['Professionals are calculated automatically from distinct identifiers',metrics.includes('new Set(')&&metrics.includes('professionalCode')],
 ['WHO summary uses automatic calculation',parts.includes('calculateWhoCompliance(previewObservations)')],
 ['Persistence does not require or store a manual professional count',!service.includes('whoSession.professionalCount')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nrc.88 WHO professional model audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
