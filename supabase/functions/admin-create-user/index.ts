import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const { data:isAdmin, error:adminError }=await caller.rpc('is_app_admin')
  if(adminError || !isAdmin) return json({error:'Forbidden'},403)

  const { data:organizationId, error:orgError }=await caller.rpc('current_organization_id')
  if(orgError || !organizationId) return json({error:'Organization context not found'},403)

  const body=await req.json().catch(()=>({}))
  const email=String(body.email||'').trim().toLowerCase()
  const username=String(body.username||'').trim()
  const displayName=String(body.displayName||'').trim()
  const role=String(body.role||'department_user')
  const employeeId=body.employeeId||null
  const scopeMode=['own','selected','all'].includes(body.scopeMode)?body.scopeMode:'own'
  const capabilities=Array.isArray(body.capabilities)?body.capabilities:[]
  const departmentIds=Array.isArray(body.departmentIds)?body.departmentIds:[]

  if(!email || !username || !displayName) return json({error:'email, username and displayName are required'},400)
  if(scopeMode==='selected' && !departmentIds.length) return json({error:'Selected department scope requires at least one department'},400)

  const { data:invited, error:inviteError }=await admin.auth.admin.inviteUserByEmail(email,{
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

  if(scopeMode==='selected' && departmentIds.length){
    const rows=departmentIds.map((departmentId:string)=>({
      user_id:userId,
      department_id:departmentId,
      can_view:true,
      can_create:true,
      can_edit:role!=='department_user',
    }))
    const { error:scopeError }=await admin.from('user_department_access').insert(rows)
    if(scopeError) return json({error:scopeError.message,userId},400)
  }

  return json({ok:true,userId},201)
})

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...corsHeaders,'Content-Type':'application/json'},
  })
}
