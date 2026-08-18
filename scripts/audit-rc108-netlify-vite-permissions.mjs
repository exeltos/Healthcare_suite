import fs from'node:fs'
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'))
const n=fs.readFileSync(new URL('../netlify.toml',import.meta.url),'utf8')
const checks=[
 ['build bypasses .bin shim',pkg.scripts.build==='node ./node_modules/vite/bin/vite.js build'],
 ['dev bypasses .bin shim',pkg.scripts.dev==='node ./node_modules/vite/bin/vite.js'],
 ['preview bypasses .bin shim',pkg.scripts.preview==='node ./node_modules/vite/bin/vite.js preview'],
 ['Netlify invokes Vite through node',n.includes('command = "node ./node_modules/vite/bin/vite.js build"')],
 ['publish remains dist',n.includes('publish = "dist"')],
]
let f=0
for(const [name,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)f++}
console.log(`rc.108 Netlify permission audit: ${checks.length-f}/${checks.length}`)
if(f)process.exit(1)
