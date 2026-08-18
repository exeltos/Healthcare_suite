import { IS_PRODUCTION } from '../../core/runtime'
import { emitAppEvent } from '../../core/events'
import { requireSupabase } from '../../integrations/supabase'
import { writeJsonCache } from '../../core/storage'
import { loadRoleConfig,saveRoleConfig,USER_ACCOUNTS_EVENT } from '../userAccountsService'
import { enforceProtectedRoleRules, validateProtectedRoleRules } from '../accessControlService'
export async function loadRoleConfiguration(){
 if(!IS_PRODUCTION)return loadRoleConfig()
 const c=requireSupabase(),org=await orgId(c);const {data,error}=await c.from('role_permission_configuration').select('module_key,permissions').eq('organization_id',org).order('module_key');if(error)throw error
 if(!(data||[]).length)return loadRoleConfig()
 const defaults=loadRoleConfig();const by=new Map((data||[]).map(r=>[r.module_key,r.permissions||{}]));const rows=defaults.map(r=>({...r,...(by.get(r.module)||{})}));writeJsonCache('healthcare-suite.role-config',rows);return rows
}
export async function saveRoleConfiguration(rows=[]){
 const protectedRows=enforceProtectedRoleRules(rows)
 validateProtectedRoleRules(protectedRows)
 if(!IS_PRODUCTION)return saveRoleConfig(protectedRows)
 const c=requireSupabase(),org=await orgId(c)
 const defaults=loadRoleConfig(),allowedModules=new Set(defaults.map(row=>row.module)),allowedRoles=new Set(Object.keys(defaults[0]||{}).filter(key=>key!=='module'))
 if(!Array.isArray(protectedRows)||protectedRows.length!==defaults.length||protectedRows.some(row=>!allowedModules.has(row.module)))throw new Error('Invalid role permission configuration.')
 for(const row of protectedRows){for(const role of allowedRoles){if(typeof row[role]!=='string'||!row[role].trim())throw new Error('Every role must have an explicit access level for every module.')}}
 const {error:del}=await c.from('role_permission_configuration').delete().eq('organization_id',org);if(del)throw del
 const payload=(protectedRows||[]).map(({module,...permissions})=>({organization_id:org,module_key:module,permissions}))
 if(payload.length){const {error}=await c.from('role_permission_configuration').insert(payload);if(error)throw error}
 writeJsonCache('healthcare-suite.role-config',protectedRows);emitAppEvent(USER_ACCOUNTS_EVENT,{entityType:'role-config',source:'supabase-cache'});return protectedRows
}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
