import fs from'node:fs'
const s=fs.readFileSync(new URL('../src/pages/Login/ResetPasswordPage.jsx',import.meta.url),'utf8')
const c=[
 ['two password fields',s.includes('Νέος κωδικός')&&s.includes('Επιβεβαίωση νέου κωδικού')],
 ['independent show hide controls',s.includes('showPassword')&&s.includes('showConfirm')&&s.includes('<EyeOff')&&s.includes('<Eye')],
 ['PKCE code is exchanged',s.includes('exchangeCodeForSession(code)')],
 ['session required before update',s.includes("if(!session)throw new Error")],
 ['real Supabase password update',s.includes('auth.updateUser({password})')],
 ['sign out after successful reset',s.includes('await client.auth.signOut()')],
 ['success redirects to login',s.includes('navigate(APP_ROUTES.LOGIN')],
]
let f=0
for(const[n,o] of c){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)f++}
console.log(`rc.113 password reset audit: ${c.length-f}/${c.length}`)
if(f)process.exit(1)
