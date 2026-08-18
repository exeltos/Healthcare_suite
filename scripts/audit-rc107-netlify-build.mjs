import fs from'node:fs'
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'))
const netlify=fs.readFileSync(new URL('../netlify.toml',import.meta.url),'utf8')
const checks=[
 ['vite is a production install dependency',Boolean(pkg.dependencies?.vite)],
 ['vite react plugin is a production install dependency',Boolean(pkg.dependencies?.['@vitejs/plugin-react'])],
 ['build script invokes vite',pkg.scripts?.build==='vite build'],
 ['Netlify build command is explicit',netlify.includes('command = "npm run build"')],
 ['Netlify publish directory is dist',netlify.includes('publish = "dist"')],
 ['Netlify includes dev dependencies as additional safety',netlify.includes('NPM_FLAGS = "--include=dev"')],
 ['SPA redirect remains configured',netlify.includes('from = "/*"')&&netlify.includes('to = "/index.html"')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`rc.107 Netlify build audit: ${checks.length-failed}/${checks.length}`)
if(failed)process.exit(1)
