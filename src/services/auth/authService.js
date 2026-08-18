import { AUTH_PROVIDER, AUTH_REDIRECT_URL, IS_DEMO, IS_PRODUCTION } from '../../core/runtime'
import { clearDemoDataset } from '../../data/demoDataGenerator'
import { clearProductionLocalOperationalCache } from '../../data/productionDataBoundary'
import { isSupabaseConfigured, requireSupabase } from '../../integrations/supabase'

export class AuthConfigurationError extends Error {
  constructor(message='Production authentication is not configured.') {
    super(message)
    this.name='AuthConfigurationError'
    this.code='AUTH_NOT_CONFIGURED'
  }
}

function ensureProductionSupabase(){
  if(AUTH_PROVIDER!=='supabase' || !isSupabaseConfigured){
    throw new AuthConfigurationError(
      AUTH_PROVIDER && AUTH_PROVIDER!=='supabase'
        ? `Authentication provider "${AUTH_PROVIDER}" is not supported by the production adapter.`
        : 'Supabase authentication has not been configured.'
    )
  }
  return requireSupabase()
}

export async function authenticateUser({ username, password }) {
  const cleanUsername=String(username||'').trim()
  const cleanPassword=String(password||'').trim()
  if(!cleanUsername || !cleanPassword) {
    const error=new Error('Missing credentials')
    error.code='MISSING_CREDENTIALS'
    throw error
  }

  if(IS_PRODUCTION) {
    const client=ensureProductionSupabase()
    if(!cleanUsername.includes('@')){
      const error=new Error('Production sign-in uses the account email address.')
      error.code='EMAIL_REQUIRED'
      throw error
    }
    const { data, error }=await client.auth.signInWithPassword({
      email:cleanUsername,
      password:cleanPassword,
    })
    if(error) {
      error.code=error.code||'INVALID_CREDENTIALS'
      throw error
    }
    const { error:activationError }=await client.rpc('activate_my_profile')
    if(activationError) throw activationError
    const context=await fetchProductionUserContext(client)
    clearProductionLocalOperationalCache()
    return {
      session:'active',
      user:{
        ...context,
        authUserId:data.user?.id||context.authUserId,
        email:data.user?.email||context.email||cleanUsername,
        authSource:'production-provider',
        demo:false,
      },
    }
  }

  if(IS_DEMO) {
    clearDemoDataset()
    return {
      session:'active',
      user:{
        name:cleanUsername,
        username:cleanUsername,
        initials:cleanUsername.slice(0,2).toUpperCase(),
        role:'admin',
        demo:false,
        authSource:'demo-session',
      },
    }
  }

  throw new AuthConfigurationError()
}

export async function validateProductionSession(){
  if(!IS_PRODUCTION) return { valid:true, user:null }
  const client=ensureProductionSupabase()
  const { data:{ user }, error }=await client.auth.getUser()
  if(error || !user) return { valid:false, user:null }
  try{
    const context=await fetchProductionUserContext(client)
    clearProductionLocalOperationalCache()
    return {
      valid:true,
      user:{
        ...context,
        authUserId:user.id,
        email:user.email||context.email||'',
        authSource:'production-provider',
        demo:false,
      },
    }
  }catch{
    return { valid:false, user:null }
  }
}

export async function requestRecovery({ username }) {
  const cleanUsername=String(username||'').trim()
  if(!cleanUsername) {
    const error=new Error('Missing username')
    error.code='MISSING_CREDENTIALS'
    throw error
  }
  if(IS_PRODUCTION) {
    const client=ensureProductionSupabase()
    if(!cleanUsername.includes('@')){
      const error=new Error('Production password recovery uses the account email address.')
      error.code='EMAIL_REQUIRED'
      throw error
    }
    const redirectTo=AUTH_REDIRECT_URL || (typeof window!=='undefined'?`${window.location.origin}/reset-password`:'')
    const { error }=await client.auth.resetPasswordForEmail(cleanUsername,redirectTo?{redirectTo}:undefined)
    if(error) throw error
    return { ok:true, demo:false }
  }
  return { ok:true, demo:true }
}

export async function signOutUser(){
  if(IS_PRODUCTION && AUTH_PROVIDER==='supabase' && isSupabaseConfigured){
    const { error }=await requireSupabase().auth.signOut()
    if(error) throw error
  }
  return { ok:true }
}

export function isSessionAllowed({ session, user } = {}) {
  if(session!=='active') return false
  if(IS_DEMO) return true
  return Boolean(user && user.authSource==='production-provider')
}

async function fetchProductionUserContext(client){
  const [{ data, error }, accessResult]=await Promise.all([
    client.rpc('get_my_context'),
    client.rpc('get_my_module_access'),
  ])
  if(error) throw error
  if(accessResult.error) throw accessResult.error
  const context=Array.isArray(data)?data[0]:data
  if(!context || !context.user_id){
    const err=new Error('The authenticated user does not have an active Healthcare Suite profile.')
    err.code='PROFILE_NOT_FOUND'
    throw err
  }
  return {
    authUserId:context.user_id,
    employeeId:context.employee_id||'',
    organizationId:context.organization_id||'',
    name:context.display_name||context.email||'',
    displayName:context.display_name||context.email||'',
    username:context.username||context.email||'',
    email:context.email||'',
    initials:initialsOf(context.display_name||context.email||''),
    role:context.role||'department_user',
    status:context.status||'active',
    department:context.department_name||'',
    professionalCategory:context.professional_category||'',
    scopeMode:context.scope_mode||'own',
    scopeDepartments:Array.isArray(context.scope_departments)?context.scope_departments:[],
    capabilities:Array.isArray(context.capabilities)?context.capabilities:[],
    moduleAccess:accessResult.data&&typeof accessResult.data==='object'?accessResult.data:{},
    lastLogin:context.last_login||null,
  }
}

function initialsOf(value=''){
  return String(value).trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()
}
