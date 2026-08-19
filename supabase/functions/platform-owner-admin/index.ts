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
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}})
  const accessToken=authHeader.replace(/^bearer\s+/i,'').trim()
  const {data:{user},error:userError}=await admin.auth.getUser(accessToken)
  if(userError||!user)return json({error:'Η συνεδρία Platform Owner δεν είναι πλέον έγκυρη. Κάνε έξοδο και νέα σύνδεση.'},401)
  const {data:owner,error:ownerError}=await admin.from('platform_owners').select('user_id,active').eq('user_id',user.id).eq('active',true).maybeSingle()
  if(ownerError)return json({error:ownerError.message},400)
  if(!owner)return json({error:'Δεν έχεις ενεργή πρόσβαση Platform Owner.'},403)
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
  if(body.action==='updateOrganization'){
    const id=String(body.organizationId||''),name=String(body.name||'').trim()
    if(!id||!name)return json({error:'organizationId and hospital name are required.'},400)
    const {data,error}=await admin.from('organizations').update({name}).eq('id',id).select('id,name,slug,active').maybeSingle()
    if(error)return json({error:error.message},400)
    if(!data)return json({error:'Hospital was not found.'},404)
    return json({ok:true,organization:data})
  }
  if(body.action==='deleteOrganization'){
    const id=String(body.organizationId||''),confirmation=String(body.confirmation||'').trim()
    if(!id)return json({error:'organizationId is required'},400)
    const {data:org,error:orgError}=await admin.from('organizations').select('id,name').eq('id',id).maybeSingle()
    if(orgError)return json({error:orgError.message},400)
    if(!org)return json({error:'Το νοσοκομείο δεν βρέθηκε.'},404)
    if(confirmation!==org.name)return json({error:'Για οριστική διαγραφή πρέπει να επιβεβαιωθεί ακριβώς το όνομα του νοσοκομείου.'},400)

    const {data:profiles,error:pError}=await admin.from('user_profiles').select('user_id').eq('organization_id',id)
    if(pError)return json({error:pError.message},400)
    const userIds=(profiles||[]).map((x:any)=>x.user_id).filter(Boolean)

    // Governance tables intentionally use ON DELETE RESTRICT. A Platform Owner hard-delete
    // explicitly clears the tenant's evidence before deleting the tenant. This action is
    // reserved for deliberate tenant reset/removal and is protected by exact-name confirmation.
    for(const table of ['security_auth_events','indicator_definition_history','system_audit_log']){
      const {error}=await admin.from(table).delete().eq('organization_id',id)
      if(error && !/does not exist|schema cache/i.test(error.message||''))return json({error:`${table}: ${error.message}`},400)
    }

    const {error:deleteError}=await admin.from('organizations').delete().eq('id',id)
    if(deleteError)return json({error:`Η οριστική διαγραφή απέτυχε: ${deleteError.message}`},409)

    for(const userId of userIds){
      const {error}=await admin.auth.admin.deleteUser(userId)
      if(error && !/not found/i.test(error.message||''))return json({error:`Το νοσοκομείο διαγράφηκε, αλλά απέτυχε η διαγραφή λογαριασμού χρήστη: ${error.message}`},500)
    }
    return json({ok:true,deletedUsers:userIds.length})
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
function slugify(v:string){
  const greek:Record<string,string>={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'}
  return String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split('').map(ch=>greek[ch]??ch).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})}

function requireEnv(name:string){const value=String(Deno.env.get(name)||'').trim();if(!value)throw new Error(`${name} is not configured.`);return value}
function readNamedKey(name:string,keyName='default'){const raw=String(Deno.env.get(name)||'').trim();if(!raw)return '';try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')return String(parsed[keyName]||'').trim()}catch{}return ''}
