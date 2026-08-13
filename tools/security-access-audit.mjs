import fs from 'node:fs'

const read=(p)=>fs.readFileSync(p,'utf8')
const fail=[]
const sidebar=read('src/components/layout/Sidebar.jsx')
const layout=read('src/components/layout/AppLayout.jsx')
const auth=read('src/services/auth/authService.js')
const access=read('src/services/accessControlService.js')
const users=read('src/services/userAccountsService.js')
const migration8=read('supabase/migrations/20260813_000008_final_production_hardening.sql')
const migration9=read('supabase/migrations/20260813_000009_role_permission_rls_alignment.sql')

if(!/canViewModule/.test(sidebar)||!/filterAccessibleItem/.test(sidebar)) fail.push('Sidebar is not permission-filtered.')
if(!/moduleForPath/.test(layout)||!/accessDenied/.test(layout)) fail.push('Protected routes do not have a module access guard.')
if(!/get_my_module_access/.test(auth)||!/moduleAccess/.test(auth)) fail.push('Production auth context does not hydrate effective module access.')
if(!/canPerformModuleAction/.test(access)) fail.push('Frontend access model lacks granular action semantics.')
if(!/staff_directory/.test(users)||!/documents/.test(users)) fail.push('Expected optional capabilities are missing.')
if(/is_current_admin/.test(migration8)) fail.push('Fresh-install migration references undefined is_current_admin().')
if(!/function public\.has_module_action/.test(migration9)) fail.push('RLS migration lacks granular module action function.')
if(!/patients_delete_scoped/.test(migration9)||!/quality_incidents_delete/.test(migration9)||!/controlled_documents_delete/.test(migration9)||!/indicator_settings_delete/.test(migration9)||!/patientattachments_delete/.test(migration9)) fail.push('Critical delete policies are not action-specific.')
if(!/has_module_action\('Κέντρο Διαχείρισης','delete'\)/.test(migration9)) fail.push('Management configuration delete path is not admin/module guarded.')


if(!/user\?\.demo===true\s*\?\s*navigation/.test(sidebar)) fail.push('Demo navigation is not explicitly exempt from Production permission filtering.')
if(!/user\.demo!==true/.test(layout)) fail.push('Demo routes are still subject to Production module guards.')
if(!/user\?\.demo===true\) return true/.test(access)) fail.push('Demo module visibility bypass is missing.')

if(fail.length){
  console.error('Security/access audit failed:')
  for(const item of fail) console.error(`- ${item}`)
  process.exitCode=1
}else{
  console.log('Security/access audit OK: sidebar visibility, route guards, effective role matrix, granular actions and critical RLS delete paths are aligned.')
}
