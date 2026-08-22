import fs from 'node:fs'

const checks = []
function check(name, ok, detail='') { checks.push({name,ok,detail}) }

const patient = fs.readFileSync('src/services/patientSamplesService.js','utf8')
const forms = fs.readFileSync('src/services/formTemplatesService.js','utf8')
const employees = fs.readFileSync('src/services/employeesService.js','utf8')

check('Patient sample loader imports production runtime guard', /import\s+\{\s*IS_PRODUCTION\s*\}\s+from\s+'\.\.\/core\/runtime'/.test(patient))
check('Patient sample loader does not persist merged records in Production', /if\s*\(!IS_PRODUCTION\)\s*patientSamplesRepository\.replaceAll\(mergedSamples\)/.test(patient))
check('Form template loader imports production runtime guard', /import\s+\{\s*IS_PRODUCTION\s*\}\s+from\s+'\.\.\/core\/runtime'/.test(forms))
check('Seed form templates are not written by a Production read', /if\s*\(!value\.length\)\s*\{\s*if\s*\(!IS_PRODUCTION\)\s*formsRepository\.replaceTemplates\(seedTemplates\)/s.test(forms))
check('Missing seed merge is not written by a Production read', /if\s*\(missingSeeds\.length\)\s*\{[^}]*if\s*\(!IS_PRODUCTION\)\s*formsRepository\.replaceTemplates\(merged\)/s.test(forms))
check('Employee normalization cleanup is not written by a Production read', /if\s*\(needsCleanup\s*&&\s*!IS_PRODUCTION\)\s*persistEmployees\(masterData,\s*normalized\)/.test(employees))
check('Legacy employee migration is not written by a Production read', /if\s*\(!IS_PRODUCTION\)\s*persistEmployees\(masterData,\s*migrated\)/.test(employees))

for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'} - ${c.name}${c.detail?`: ${c.detail}`:''}`)
const failed = checks.filter(x=>!x.ok)
console.log(`Production read purity: ${checks.length-failed.length}/${checks.length}`)
if (failed.length) process.exit(1)
