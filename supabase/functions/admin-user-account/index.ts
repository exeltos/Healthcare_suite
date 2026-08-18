import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ROLES=new Set(['admin','infection_lead','infection_liaison','medical_reviewer','department_user','laboratory'])
const ALLOWED_STATUSES=new Set(['pending','invited','active','disabled'])
const ALLOWED_CAPABILITIES=new Set(['hand_hygiene_observer','staff_directory','quality','committees','training','documents','laboratory','lira'])

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST') return json({error:'Method not allowed'},405)

  const url=Deno.env.get('SUPABASE_URL')!
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader=req.headers.get('Authorization')||''

  const caller=createClient(url,anonKey,{global:{headers:{Authorization:authHeader}}})
  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}})

  if(!authHeader.toLowerCase().startsWith('bearer ')) return json({error:'Unauthorized'},401)
  const { data:{user:callerUser},error:callerError }=await caller.auth.getUser()
  if(callerError||!callerUser) return json({error:'Unauthorized'},401)

  const { data:isAdmin,error:adminError }=await caller.rpc('is_app_admin')
  if(adminError||!isAdmin) return json({error:'Forbidden'},403)

  const { data:organizationId,error:orgError }=await caller.rpc('current_organization_id')
  if(orgError||!organizationId) return json({error:'Organization context not found'},403)

  const body=await req.json().catch(()=>({}))
  const action=String(body.action||'')

  if(action==='create') return createAccount({body,organizationId,admin})
  if(action==='update') return updateAccount({body,organizationId,admin})
  if(action==='delete') return deleteAccount({body,organizationId,admin})
  return json({error:'Unsupported action'},400)
})

async function createAccount({body,organizationId,admin}:any){
  const email=String(body.email||'').trim().toLowerCase()
  const username=String(body.username||'').trim()
  const displayName=String(body.displayName||'').trim()
  const role=String(body.role||'department_user')
  const employeeId=body.employeeId||null
  const scopeMode=['own','selected','all'].includes(body.scopeMode)?body.scopeMode:'own'
  const capabilities=Array.isArray(body.capabilities)?body.capabilities:[]
  const departmentIds=uniqueStrings(body.departmentIds)

  if(!ALLOWED_ROLES.has(role)) return json({error:'Unsupported role'},400)
  if(!validCapabilities(capabilities)) return json({error:'Unsupported capability'},400)
  const scopeError=await validateTenantLinks(admin,organizationId,employeeId,departmentIds)
  if(scopeError) return json({error:scopeError},400)

  if(!email||!username||!displayName) return json({error:'email, username and displayName are required'},400)
  if(scopeMode==='selected'&&!departmentIds.length) return json({error:'Selected department scope requires at least one department'},400)

  const base=String(Deno.env.get('APP_BASE_URL')||'').replace(/\/$/,'')
  const { data:invited,error:inviteError }=await admin.auth.admin.inviteUserByEmail(email,{
    redirectTo:base?`${base}/reset-password`:undefined,
    data:{display_name:displayName,username},
  })
  if(inviteError) return json({error:inviteError.message},400)

  const userId=invited.user?.id
  if(!userId) return json({error:'Auth user was not created'},500)

  const { error:profileError }=await admin.from('user_profiles').insert({
    user_id:userId,
    organization_id:organizationId,
    employee_id:employeeId,
    username,
    email,
    display_name:displayName,
    role,
    status:'invited',
    scope_mode:scopeMode,
    capabilities,
  })
  if(profileError){
    await admin.auth.admin.deleteUser(userId).catch(()=>{})
    return json({error:profileError.message},400)
  }

  if(scopeMode==='selected'&&departmentIds.length){
    const { error:scopeError }=await admin.from('user_department_access').insert(
      departmentIds.map((departmentId:string)=>({
        user_id:userId,
        department_id:departmentId,
        can_view:true,
        can_create:true,
        can_edit:role!=='department_user',
      }))
    )
    if(scopeError) return json({error:scopeError.message,userId},400)
  }
  return json({ok:true,userId},201)
}


async function updateAccount({body,organizationId,admin}:any){
  const userId=String(body.userId||'')
  const email=String(body.email||'').trim().toLowerCase()
  const username=String(body.username||'').trim()
  const displayName=String(body.displayName||'').trim()
  const role=String(body.role||'department_user')
  const status=String(body.status||'active')
  const scopeMode=['own','selected','all'].includes(body.scopeMode)?body.scopeMode:'own'
  const capabilities=Array.isArray(body.capabilities)?body.capabilities:[]
  const departmentIds=uniqueStrings(body.departmentIds)

  if(!ALLOWED_ROLES.has(role)) return json({error:'Unsupported role'},400)
  if(!ALLOWED_STATUSES.has(status)) return json({error:'Unsupported account status'},400)
  if(!validCapabilities(capabilities)) return json({error:'Unsupported capability'},400)
  const scopeError=await validateTenantLinks(admin,organizationId,body.employeeId||null,departmentIds)
  if(scopeError) return json({error:scopeError},400)

  if(!userId||!email||!username||!displayName) return json({error:'userId, email, username and displayName are required'},400)
  if(scopeMode==='selected'&&!departmentIds.length) return json({error:'Selected department scope requires at least one department'},400)

  const { data:existing,error:existingError }=await admin
    .from('user_profiles')
    .select('user_id,organization_id,role,status')
    .eq('user_id',userId)
    .maybeSingle()
  if(existingError) return json({error:existingError.message},400)
  if(!existing||existing.organization_id!==organizationId) return json({error:'User not found in current organization'},404)

  if(existing.role==='admin' && (role!=='admin'||status==='disabled')){
    const { count,error:countError }=await admin.from('user_profiles')
      .select('*',{count:'exact',head:true})
      .eq('organization_id',organizationId)
      .eq('role','admin')
      .eq('status','active')
    if(countError) return json({error:countError.message},400)
    if((count||0)<=1) return json({error:'The last active administrator cannot be demoted or disabled.'},400)
  }

  const { error:authError }=await admin.auth.admin.updateUserById(userId,{
    email,
    user_metadata:{display_name:displayName,username},
  })
  if(authError) return json({error:authError.message},400)

  const { error:profileError }=await admin.from('user_profiles').update({
    username,email,display_name:displayName,employee_id:body.employeeId||null,role,status,scope_mode:scopeMode,capabilities,
  }).eq('user_id',userId).eq('organization_id',organizationId)
  if(profileError) return json({error:profileError.message},400)

  const { error:clearError }=await admin.from('user_department_access').delete().eq('user_id',userId)
  if(clearError) return json({error:clearError.message},400)

  if(scopeMode==='selected'&&departmentIds.length){
    const { error:scopeError }=await admin.from('user_department_access').insert(
      departmentIds.map((departmentId:string)=>({
        user_id:userId,
        department_id:departmentId,
        can_view:true,
        can_create:true,
        can_edit:role!=='department_user',
      }))
    )
    if(scopeError) return json({error:scopeError.message},400)
  }

  return json({ok:true,userId},200)
}

async function deleteAccount({body,organizationId,admin}:any){
  const userId=String(body.userId||'')
  if(!userId) return json({error:'userId is required'},400)

  const { data:profile,error:profileError }=await admin
    .from('user_profiles')
    .select('user_id,organization_id,role')
    .eq('user_id',userId)
    .maybeSingle()
  if(profileError) return json({error:profileError.message},400)
  if(!profile||profile.organization_id!==organizationId) return json({error:'User not found in current organization'},404)

  const { count,error:countError }=await admin
    .from('user_profiles')
    .select('*',{count:'exact',head:true})
    .eq('organization_id',organizationId)
    .eq('role','admin')
    .eq('status','active')
  if(countError) return json({error:countError.message},400)
  if(profile.role==='admin'&&(count||0)<=1) return json({error:'The last active administrator cannot be deleted.'},400)

  const { error:deleteError }=await admin.auth.admin.deleteUser(userId)
  if(deleteError) return json({error:deleteError.message},400)
  return json({ok:true},200)
}


async function validateTenantLinks(admin:any,organizationId:string,employeeId:string|null,departmentIds:string[]){
  if(employeeId){
    const {data,error}=await admin.from('employees').select('id').eq('id',employeeId).eq('organization_id',organizationId).maybeSingle()
    if(error) return error.message
    if(!data) return 'Linked employee was not found in the current organization.'
  }
  if(departmentIds.length){
    const {data,error}=await admin.from('departments').select('id').eq('organization_id',organizationId).in('id',departmentIds)
    if(error) return error.message
    if((data||[]).length!==departmentIds.length) return 'One or more departments are outside the current organization.'
  }
  return ''
}

function uniqueStrings(value:unknown){
  return [...new Set((Array.isArray(value)?value:[]).map(String).map(x=>x.trim()).filter(Boolean))]
}

function validCapabilities(value:unknown){
  return Array.isArray(value)&&value.every(item=>ALLOWED_CAPABILITIES.has(String(item)))
}

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...corsHeaders,'Content-Type':'application/json'},
  })
}
