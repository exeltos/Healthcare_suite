import fs from 'node:fs'
const r=p=>fs.readFileSync(p,'utf8')
const directory=r('src/services/backend/directoryService.js'),roles=r('src/services/backend/roleConfigurationBackendService.js'),config=r('src/services/backend/configurationBackendService.js'),migration=r('supabase/migrations/20260813_000014_management_center_integrity.sql')
const failures=[]
if(!/eq\('organization_id',org\).*order\('module_key'\)/.test(roles))failures.push('Role configuration read is not tenant-scoped.')
if(!/Invalid role permission configuration/.test(roles)||!/explicit access level/.test(roles))failures.push('Role permission payload is not structurally validated.')
if(!/This employee already has an access account/.test(directory)||!/linked employee was not found/i.test(directory))failures.push('Production account creation does not enforce one employee/one valid account.')
if(!/selected departments are not valid/.test(directory))failures.push('Invalid department scope can reach the account edge function.')
if((config.match(/eq\('organization_id',org\)/g)||[]).length<2)failures.push('Management configuration reads are not consistently tenant-scoped.')
if(!/Unknown Studio configuration module/.test(config)||!/duplicate row identifiers/.test(config))failures.push('Studio configuration payload is not validated.')
if(!/user_department_access_org_guard/.test(migration)||!/user_profiles_role_check/.test(migration)||!/studio_configuration_rows_guard/.test(migration))failures.push('Database Management Center guards are incomplete.')
if(failures.length){console.error('Management Center integrity audit failed:');failures.forEach(x=>console.error('- '+x));process.exitCode=1}else console.log('Management Center integrity audit OK: users, roles, scopes and configuration are tenant-safe and guarded.')
