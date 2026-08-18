import { requireSupabase } from '../../integrations/supabase'
async function invoke(body){const {data,error}=await requireSupabase().functions.invoke('platform-owner-admin',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
export async function loadPlatformOrganizations(){return (await invoke({action:'list'})).organizations||[]}
export async function createPlatformOrganization(input){return invoke({action:'createOrganization',...input})}
export async function setPlatformOrganizationActive(organizationId,active){return invoke({action:'setOrganizationActive',organizationId,active})}
export async function resendPlatformAdminInvite(organizationId,userId){return invoke({action:'resendAdminInvite',organizationId,userId})}
