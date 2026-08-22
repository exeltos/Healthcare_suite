import fs from 'node:fs'
const repo=fs.readFileSync('src/repositories/organizationRepository.js','utf8')
const layout=fs.readFileSync('src/components/layout/AppLayout.jsx','utf8')
const checks=[
 ['organization repo imports production runtime',repo.includes("IS_PRODUCTION")],
 ['organization reads fail open to fallback without render write',repo.includes('if(IS_PRODUCTION) return Array.isArray(seed)?seed:[]')],
 ['legacy seed migration stays outside production guard',repo.indexOf('if(IS_PRODUCTION)')<repo.indexOf('legacyKey && hasStoredValue')],
 ['production shell starts in loading state',layout.includes("useState(IS_PRODUCTION?'loading':'ready')")],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`Module-entry purity: ${checks.length-failed}/${checks.length}`)
if(failed)process.exit(1)
