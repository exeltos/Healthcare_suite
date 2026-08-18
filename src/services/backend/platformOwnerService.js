import { requireSupabase } from '../../integrations/supabase'

async function extractFunctionError(error){
  let message=error?.message||'Η λειτουργία του διακομιστή απέτυχε.'
  const response=error?.context
  if(response){
    try{
      const source=typeof response.clone==='function'?response.clone():response
      const payload=await source.json()
      if(payload?.error)message=String(payload.error)
      else if(payload?.message)message=String(payload.message)
    }catch{
      try{
        const source=typeof response.clone==='function'?response.clone():response
        const text=await source.text()
        if(text?.trim())message=text.trim()
      }catch{}
    }
  }
  return new Error(message)
}

async function invoke(body){
  const {data,error}=await requireSupabase().functions.invoke('platform-owner-admin',{body})
  if(error)throw await extractFunctionError(error)
  if(data?.error)throw new Error(data.error)
  return data
}

export async function loadPlatformOrganizations(){return (await invoke({action:'list'})).organizations||[]}
export async function createPlatformOrganization(input){return invoke({action:'createOrganization',...input})}
export async function updatePlatformOrganization(organizationId,input){return invoke({action:'updateOrganization',organizationId,...input})}
export async function deletePlatformOrganization(organizationId){return invoke({action:'deleteOrganization',organizationId})}
export async function setPlatformOrganizationActive(organizationId,active){return invoke({action:'setOrganizationActive',organizationId,active})}
export async function resendPlatformAdminInvite(organizationId,userId){return invoke({action:'resendAdminInvite',organizationId,userId})}
