import fs from 'node:fs'
const read=(p)=>fs.readFileSync(p,'utf8')
const page=read('src/pages/Surveillance/AntimicrobialConsumptionPage.jsx')
const backend=read('src/services/backend/indicatorBackendService.js')
const storage=read('src/core/storage/jsonStorage.js')
const checks=[
 ['DDD page uses record-level Production backend',page.includes("await saveIndicatorSourceRecordBackend('antibiotic_ddd',row)")],
 ['DDD delete uses Production backend',page.includes("await deleteIndicatorSourceRecordBackend('antibiotic_ddd'")],
 ['Indicator backend upserts Supabase source record',backend.includes(".from('indicator_source_records')")&&backend.includes(".upsert(payload,{onConflict:'organization_id,source_type,record_key'})")],
 ['Indicator backend verifies saved row by organization/type/key',backend.includes(".eq('organization_id',org).eq('source_type',type).eq('record_key',key).single()")],
 ['Production DDD save has no local fallback before Supabase verification',/if\(!IS_PRODUCTION\)[\s\S]*?return row[\s\S]*?const c=requireSupabase\(\),org=await orgId\(c\)[\s\S]*?const \{data:verified,error:verifyError\}/.test(backend)],
 ['Local mirror is updated only after verified Supabase save',backend.indexOf('const saved={...(verified.data||{})')>-1 && backend.indexOf('const saved={...(verified.data||{})')<backend.indexOf('local(next);return saved')],
 ['Production operational browser storage is memory-only',storage.includes('const productionMemory = new Map()')&&storage.includes('if(IS_PRODUCTION && !isProductionPreference(storageKey))')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nProduction persistence rc.171 (DDD phase): ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
