import fs from'node:fs'
const r=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const rt=r('src/core/runtime/runtimeConfig.js'),cl=r('src/integrations/supabase/client.js'),lg=r('src/pages/Login/LoginPage.jsx')
const c=[
 ['runtime normalizes rest/auth/storage suffix',rt.includes("replace(/\\/(?:rest|auth|storage)\\/v1$/i,'')")],
 ['client normalizes Supabase URL',cl.includes('normalizeSupabaseUrl')],
 ['recovery has dedicated handler',lg.includes('handleRecoverySubmit')],
 ['login shows build version',lg.includes("BUILD_VERSION = '0.12.0-rc.111'")&&lg.includes('v{BUILD_VERSION}')],
]
let f=0;for(const[n,o]of c){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)f++}
console.log(`rc.111 auth/runtime audit: ${c.length-f}/${c.length}`);if(f)process.exit(1)
