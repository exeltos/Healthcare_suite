import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')
const migration=read('supabase/migrations/20260818_000027_tenant_role_isolation_hardening.sql')
const accountFn=read('supabase/functions/admin-user-account/index.ts')
const legacyFn=read('supabase/functions/admin-create-user/index.ts')
const checks=[
  ['profile identity immutable',/User profile identity is immutable/.test(migration)],
  ['profile organization immutable',/User profile organization is immutable/.test(migration)],
  ['employee tenant guard',/Linked employee must belong to the user organization/.test(migration)],
  ['direct profile writes revoked',/revoke insert,update,delete on public\.user_profiles from authenticated/i.test(migration)],
  ['direct scope writes revoked',/revoke insert,update,delete on public\.user_department_access from authenticated/i.test(migration)],
  ['security definer public execute revoked',/revoke all on function public\.current_organization_id\(\) from public,anon/i.test(migration)],
  ['admin function authenticates bearer caller',/caller\.auth\.getUser\(\)/.test(accountFn)],
  ['admin function validates employee tenant',/validateTenantLinks\(admin,organizationId/.test(accountFn)&&/\.eq\('organization_id',organizationId\)/.test(accountFn)],
  ['admin function allowlists roles',/ALLOWED_ROLES/.test(accountFn)&&/Unsupported role/.test(accountFn)],
  ['admin function allowlists capabilities',/ALLOWED_CAPABILITIES/.test(accountFn)&&/Unsupported capability/.test(accountFn)],
  ['compatibility create function equally hardened',/caller\.auth\.getUser\(\)/.test(legacyFn)&&/validateTenantLinks/.test(legacyFn)&&/ALLOWED_ROLES/.test(legacyFn)],
]
const failed=checks.filter(([,ok])=>!ok)
for(const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`)
if(failed.length){console.error(`Tenant isolation audit failed: ${failed.length} finding(s).`);process.exit(1)}
console.log(`Tenant isolation audit passed (${checks.length}/${checks.length}).`)
