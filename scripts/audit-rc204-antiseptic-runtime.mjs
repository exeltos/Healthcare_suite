import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const loadStart=s.indexOf('export async function loadPreventionRecords')
const saveStart=s.indexOf('export async function savePreventionRecord')
const deleteStart=s.indexOf('export async function deletePreventionRecord')
const load=s.slice(loadStart,saveStart)
const save=s.slice(saveStart,deleteStart)
const del=s.slice(deleteStart)
const checks=[
 ['load branch reads relational table',load.includes("if(type==='antiseptic')")&&load.includes("from('antiseptic_consumption_records')")],
 ['load branch does not use input',!load.includes('const row={...input')],
 ['save branch exists in save function',save.includes("if(type==='antiseptic')")&&save.includes('Supabase antiseptic write could not be verified.')],
 ['save has org/input context',save.includes('const c=requireSupabase(),org=await orgId(c)')],
 ['delete branch exists',del.includes("if(type==='antiseptic')")&&del.includes('Supabase delete did not remove the antiseptic record.')],
 ['indicator remains derived',s.includes('consumption/patientDays')]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Antiseptic runtime rc.204: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
