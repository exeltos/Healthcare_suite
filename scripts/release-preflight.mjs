import fs from 'node:fs'

const failures=[]
const warnings=[]
const major=Number(process.versions.node.split('.')[0])
if(major<20) failures.push(`Node ${process.versions.node} is too old; use Node 20 or newer for release verification.`)

const requiredFiles=[
  'package.json','package-lock.json','vite.config.js','src/main.jsx','src/App.jsx',
  'supabase/migrations/20260818_000027_tenant_role_isolation_hardening.sql',
  'tools/tenant-isolation-audit.mjs','tools/clinical-scenario-contract-audit.mjs',
]
for(const file of requiredFiles) if(!fs.existsSync(file)) failures.push(`Required release file is missing: ${file}`)

for(const dep of ['vite','@babel/parser','@vitejs/plugin-react']){
  if(!fs.existsSync(`node_modules/${dep}/package.json`)) failures.push(`Development dependency is not installed: ${dep}. Run npm install first.`)
}


const envText=fs.existsSync('.env')?fs.readFileSync('.env','utf8'):''
if(/VITE_[A-Z0-9_]*(SERVICE_ROLE|SECRET)[A-Z0-9_]*\s*=\s*\S+/i.test(envText)) failures.push('A secret/service-role value appears in a VITE_* frontend environment variable.')

if(process.env.VITE_APP_MODE==='production'){
  if(process.env.VITE_AUTH_PROVIDER!=='supabase') failures.push('Production VITE_AUTH_PROVIDER must be supabase.')
  if(process.env.VITE_DATA_PROVIDER!=='supabase') failures.push('Production VITE_DATA_PROVIDER must be supabase.')
  if(!process.env.VITE_SUPABASE_URL) failures.push('Production VITE_SUPABASE_URL is missing.')
  if(!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY) failures.push('Production Supabase publishable/anon key is missing.')
}

console.log('Healthcare Suite release preflight')
console.log('==================================')
for(const warning of warnings) console.log(`WARN: ${warning}`)
for(const failure of failures) console.log(`BLOCKER: ${failure}`)
if(!warnings.length&&!failures.length) console.log('Release environment preflight passed.')
console.log(`\n${failures.length} blocker(s), ${warnings.length} warning(s).`)
if(failures.length) process.exitCode=2
