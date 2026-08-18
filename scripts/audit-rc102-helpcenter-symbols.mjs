import fs from 'node:fs'
const s=fs.readFileSync(new URL('../src/components/help/HelpCenter.jsx',import.meta.url),'utf8')
const imported=/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/.exec(s)?.[1]||''
const checks=[
  ['CircleDot is not imported from lucide-react',!imported.split(',').map(x=>x.trim()).includes('CircleDot')],
  ['Local CircleDot helper remains defined',s.includes('function CircleDot(){return <span className="help-tip-dot">?</span>}')],
]
let f=0
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)f++}
console.log(`rc.102 HelpCenter symbol audit: ${checks.length-f}/${checks.length} passed`)
if(f)process.exit(1)
