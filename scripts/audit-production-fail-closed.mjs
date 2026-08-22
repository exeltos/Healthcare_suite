import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8')
const checks=[]
const add=(label,ok)=>checks.push([label,Boolean(ok)])

const storage=read('src/core/storage/jsonStorage.js')
add('Production operational writeJson fails closed', /IS_PRODUCTION\s*&&\s*!isProductionPreference\(storageKey\)\s*&&\s*productionCacheWriteDepth\s*<=\s*0[\s\S]{0,180}throw new Error/.test(storage))
add('Verified production cache scope exists', /export function withProductionCacheWrite\(callback\)/.test(storage))
add('Cache scope always closes', /finally\s*\{[\s\S]{0,160}productionCacheWriteDepth\s*=\s*Math\.max/.test(storage))
add('Explicit cache mirror remains memory-only in Production', /export function writeJsonCache[\s\S]{0,120}persist\(storageKey,value\)/.test(storage))

const backendFiles=[
  'src/services/backend/clinicalDirectoryService.js',
  'src/services/backend/clinicalSupportBackendService.js',
  'src/services/backend/indicatorBackendService.js',
  'src/services/backend/qualityBackendService.js',
  'src/services/backend/organizationBackendService.js',
  'src/services/backend/preventionBackendService.js',
  'src/services/backend/surveillanceControlsBackendService.js',
  'src/services/backend/configurationBackendService.js',
]
for(const file of backendFiles){
  const source=read(file)
  add(`${path.basename(file)} declares verified cache mirror`, /withProductionCacheWrite/.test(source))
}

const boundary=read('src/data/productionDataBoundary.js')
add('Production cache reset uses verified cache scope', /clearProductionLocalOperationalCache[\s\S]{0,180}withProductionCacheWrite/.test(boundary))

const indicator=read('src/services/backend/indicatorBackendService.js')
add('Indicator authoritative writes mirror only after Supabase success', /if\(error\)throw error[\s\S]{0,220}withProductionCacheWrite\(\(\)=>local\(rows\)\)/.test(indicator))
add('Indicator record verification precedes cache mirror', /if\(!verified\)throw new Error[\s\S]{0,450}withProductionCacheWrite\(\(\)=>local\(next\)\)/.test(indicator))

const clinical=read('src/services/backend/clinicalDirectoryService.js')
add('Clinical Supabase hydration uses explicit cache mirror', /withProductionCacheWrite\(\(\)=>savePatientRegistry/.test(clinical) && /withProductionCacheWrite\(\(\)=>replaceSurveillanceCases/.test(clinical))

const configuration=read('src/services/backend/configurationBackendService.js')
add('Configuration Supabase hydration uses explicit cache mirror', /withProductionCacheWrite\(\(\)=>\{saveFormTemplates/.test(configuration) && /withProductionCacheWrite\(\(\)=>saveStudioRows/.test(configuration))

console.log('Healthcare Suite rc.211 fail-closed persistence audit')
console.log('====================================================')
for(const [label,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${label}`)
const failed=checks.filter(([,ok])=>!ok)
console.log(`\n${checks.length-failed.length}/${checks.length} checks passed.`)
if(failed.length)process.exitCode=1
