import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  const url=requireEnv('SUPABASE_URL')
  const publishable=readNamedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const secret=readNamedKey('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if(!publishable)return json({error:'Supabase publishable key is not available in the Edge Function environment.'},500)
  if(!secret)return json({error:'Supabase secret key is not available in the Edge Function environment.'},500)
  const authHeader=req.headers.get('Authorization')||''
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Unauthorized'},401)
  const caller=createClient(url,publishable,{global:{headers:{Authorization:authHeader}},auth:{autoRefreshToken:false,persistSession:false}})
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}})
  const {data:{user},error:userError}=await caller.auth.getUser()
  if(userError||!user)return json({error:'Unauthorized'},401)
  const {data:isOwner,error:ownerError}=await caller.rpc('is_platform_owner')
  if(ownerError||!isOwner)return json({error:'Forbidden'},403)
  const body=await req.json().catch(()=>({}))
  if(body.action==='list'){
    const {data,error}=await admin.from('organizations').select('id,name,slug,active,created_at,updated_at').order('name')
    if(error)return json({error:error.message},400)
    const ids=(data||[]).map((x:any)=>x.id)
    const {data:profiles,error:pError}=ids.length?await admin.from('user_profiles').select('organization_id,user_id,email,display_name,status').in('organization_id',ids).eq('role','admin'):({data:[],error:null} as any)
    if(pError)return json({error:pError.message},400)
    return json({organizations:(data||[]).map((org:any)=>({...org,administrators:(profiles||[]).filter((p:any)=>p.organization_id===org.id)}))})
  }
  if(body.action==='createOrganization'){
    const name=String(body.name||'').trim(),slug=slugify(body.slug||name),email=String(body.adminEmail||'').trim().toLowerCase(),displayName=String(body.adminName||'').trim()
    if(!name||!slug||!email||!displayName)return json({error:'Hospital name, slug, administrator name and email are required.'},400)
    const {data:org,error:orgError}=await admin.from('organizations').insert({name,slug,active:true}).select('id,name,slug,active').single()
    if(orgError)return json({error:orgError.message},400)
    const redirectTo=appRedirect('/reset-password')
    const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{display_name:displayName,username:email}})
    if(inviteError){await admin.from('organizations').delete().eq('id',org.id);return json({error:inviteError.message},400)}
    const userId=invited.user?.id
    if(!userId){await admin.from('organizations').delete().eq('id',org.id);return json({error:'Administrator Auth user was not created.'},500)}
    const {error:profileError}=await admin.from('user_profiles').insert({user_id:userId,organization_id:org.id,employee_id:null,username:email,email,display_name:displayName,role:'admin',status:'invited',scope_mode:'all',capabilities:[]})
    if(profileError){await admin.auth.admin.deleteUser(userId).catch(()=>{});await admin.from('organizations').delete().eq('id',org.id);return json({error:profileError.message},400)}
    return json({ok:true,organization:org,userId},201)
  }
  if(body.action==='setOrganizationActive'){
    const id=String(body.organizationId||'');if(!id)return json({error:'organizationId is required'},400)
    const {error}=await admin.from('organizations').update({active:Boolean(body.active)}).eq('id',id)
    if(error)return json({error:error.message},400)
    return json({ok:true})
  }
  if(body.action==='resendAdminInvite'){
    const userId=String(body.userId||''),organizationId=String(body.organizationId||'')
    const {data:profile,error:pError}=await admin.from('user_profiles').select('email,display_name,role,organization_id').eq('user_id',userId).maybeSingle()
    if(pError||!profile||profile.role!=='admin'||profile.organization_id!==organizationId)return json({error:'Hospital administrator not found.'},404)
    // Supabase cannot resend invite to an existing Auth user via inviteUserByEmail reliably; recovery provides the same secure password-establishment path.
    const {error}=await admin.auth.resetPasswordForEmail(profile.email,{redirectTo:appRedirect('/reset-password')})
    if(error)return json({error:error.message},400)
    return json({ok:true})
  }
  return json({error:'Unsupported action'},400)
})
function appRedirect(path:string){const base=String(Deno.env.get('APP_BASE_URL')||'').replace(/\/$/,'');return base?`${base}${path}`:undefined}
function slugify(v:string){return String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})}

function requireEnv(name:string){const value=String(Deno.env.get(name)||'').trim();if(!value)throw new Error(`${name} is not configured.`);return value}
function readNamedKey(name:string,keyName='default'){const raw=String(Deno.env.get(name)||'').trim();if(!raw)return '';try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')return String(parsed[keyName]||'').trim()}catch{}return ''}
