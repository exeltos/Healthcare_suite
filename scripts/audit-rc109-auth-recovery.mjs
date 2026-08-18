import fs from'node:fs'
const r=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const routes=r('src/config/routes.js'),app=r('src/App.jsx'),auth=r('src/services/auth/authService.js'),dir=r('src/services/backend/directoryService.js'),page=r('src/pages/Login/ResetPasswordPage.jsx')
const c=[
 ['reset route exists',routes.includes("RESET_PASSWORD: '/reset-password'")],
 ['reset page is public',app.includes('APP_ROUTES.RESET_PASSWORD')&&app.includes('<ResetPasswordPage />')],
 ['user recovery redirects to reset page',auth.includes("`${window.location.origin}/reset-password`")],
 ['admin recovery redirects to reset page',dir.includes("`${window.location.origin}/reset-password`")],
 ['reset page calls updateUser',page.includes('auth.updateUser({password})')],
 ['reset page handles PASSWORD_RECOVERY',page.includes("event==='PASSWORD_RECOVERY'")],
]
let f=0;for(const[n,o]of c){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)f++}
console.log(`rc.109 auth recovery audit: ${c.length-f}/${c.length}`);if(f)process.exit(1)
