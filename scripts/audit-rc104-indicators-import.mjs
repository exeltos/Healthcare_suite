import fs from 'node:fs'
const s=fs.readFileSync(new URL('../src/pages/Quality/IndicatorsPage.jsx',import.meta.url),'utf8')
const checks=[
  ['promoted antibiotics import is standalone',s.includes("import { PROMOTED_ANTIBIOTICS_EVENT } from '../../services/preventionService'\nimport {\n  Activity")],
  ['no nested import token remains',!s.includes("import {\nimport { PROMOTED_ANTIBIOTICS_EVENT")],
]
let f=0
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)f++}
console.log(`rc.104 Indicators import audit: ${checks.length-f}/${checks.length}`)
if(f)process.exit(1)
