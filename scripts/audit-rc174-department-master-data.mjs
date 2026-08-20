import fs from 'node:fs'
const master=fs.readFileSync('src/services/masterDataService.js','utf8')
const directory=fs.readFileSync('src/services/backend/directoryService.js','utf8')
const config=fs.readFileSync('src/services/backend/configurationBackendService.js','utf8')
const settings=fs.readFileSync('src/pages/SettingsPage.jsx','utf8')
const checks=[
 ['Production departments do not merge demo defaults',master.includes("key === 'departments' && IS_PRODUCTION")],
 ['Directory departments are tenant scoped',directory.includes(".eq('organization_id',organizationId)")],
 ['Department writes verify organization',directory.includes('Department organization verification failed.')],
 ['Department writes are read-back verified',directory.includes('Department write could not be verified in Supabase.')],
 ['Generic master library persistence excludes departments',config.includes(".filter(([key])=>key!=='departments')")],
 ['Master hydration reads real departments table',config.includes("c.from('departments').select('id,code,name,active')")],
 ['Settings exposes Supabase departments source',settings.includes("Supabase · departments")],
 ['Empty departments state prompts real creation',settings.includes("Δεν υπάρχουν ακόμη τμήματα στη Supabase")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Department master data rc.174: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)
