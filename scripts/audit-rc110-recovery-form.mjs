import fs from'node:fs'
const s=fs.readFileSync(new URL('../src/pages/Login/LoginPage.jsx',import.meta.url),'utf8')
const c=[
 ['dedicated recovery handler',s.includes('async function handleRecoverySubmit(event)')],
 ['recovery form uses dedicated handler',s.includes('onSubmit={handleRecoverySubmit}')],
 ['recovery uses only recoveryEmail',s.includes("form.get('recoveryEmail')")],
 ['recovery field is recoveryEmail',s.includes('name="recoveryEmail"')],
 ['login credential validation remains login-only',s.includes("if (!username || !password) { setMessage(t('login.missingCredentials')); return }")],
 ['production recovery exposes Supabase error',s.includes("IS_PRODUCTION && error?.message")],
]
let f=0;for(const[n,o]of c){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)f++}
console.log(`rc.110 recovery-form audit: ${c.length-f}/${c.length}`);if(f)process.exit(1)
