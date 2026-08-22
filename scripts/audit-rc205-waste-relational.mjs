import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const loadStart=s.indexOf('export async function loadPreventionRecords')
const saveStart=s.indexOf('export async function savePreventionRecord')
const deleteStart=s.indexOf('export async function deletePreventionRecord')
const load=s.slice(loadStart,saveStart)
const save=s.slice(saveStart,deleteStart)
const del=s.slice(deleteStart)
const checks=[
 ['waste load branch',load.includes("if(type==='waste')")&&load.includes("from('waste_measurement_records')")],
 ['waste save branch',save.includes("if(type==='waste')")&&save.includes('Supabase waste write could not be verified.')],
 ['waste numeric verification',save.includes('Waste verification failed: ${key}.')],
 ['waste delete branch',del.includes("if(type==='waste')")&&del.includes('Supabase delete did not remove the waste record.')],
 ['waste indicator derived',s.includes('weight/patientDays')],
 ['antiseptic branch preserved',load.includes("if(type==='antiseptic')")&&save.includes('Supabase antiseptic write could not be verified.')],
 ['WHO branch preserved',load.includes("if(type==='hand_hygiene')")&&save.includes('WHO session write could not be verified.')],
 ['generic prevention remains',s.includes("from('prevention_records').upsert(payload")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Waste relational rc.205: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
