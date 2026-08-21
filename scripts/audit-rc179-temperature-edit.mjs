import fs from 'node:fs'
const s=fs.readFileSync('src/pages/Patients/PatientCaseSections.jsx','utf8')
const b=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const checks=[
 ['temperature has local draft state',s.includes('temperatureDraft')],
 ['typing only updates local draft',s.includes('onChange={setTemperatureDraft}')],
 ['temperature persists on blur',s.includes("await patchNested('assessment',{temperature:raw})")],
 ['invalid value restores persisted value',s.includes("setTemperatureDraft(String(data.assessment?.temperature ?? ''))")],
 ['UI validation range 30-45',s.includes('value<30 || value>45')],
 ['backend validation remains 30-45',b.includes('temperature<30 || temperature>45')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(x=>x[1]).length
console.log(`Temperature edit rc.179: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
