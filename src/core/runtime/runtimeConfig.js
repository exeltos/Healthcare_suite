const RAW_MODE = String(import.meta.env.VITE_APP_MODE || '').trim().toLowerCase()
const RAW_AUTH_PROVIDER = String(import.meta.env.VITE_AUTH_PROVIDER || '').trim().toLowerCase()
const RAW_DATA_PROVIDER = String(import.meta.env.VITE_DATA_PROVIDER || '').trim().toLowerCase()
const RAW_SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
function normalizeSupabaseUrl(value=''){
  let url=String(value||'').trim().replace(/\/+$/,'')
  url=url.replace(/\/(?:rest|auth|storage)\/v1$/i,'')
  return url
}
const NORMALIZED_SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL)
const RAW_SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Safety rule: a deployment configured for Supabase is always Production.
// This prevents operational Demo/default records from appearing when a Netlify
// VITE_APP_MODE variable is missing or stale.
const HAS_SUPABASE_RUNTIME =
  RAW_AUTH_PROVIDER === 'supabase' ||
  RAW_DATA_PROVIDER === 'supabase' ||
  Boolean(NORMALIZED_SUPABASE_URL && RAW_SUPABASE_KEY)

export const DEPLOYMENT_MODE = RAW_MODE === 'production' || HAS_SUPABASE_RUNTIME ? 'production' : 'demo'

const DEMO_RUNTIME_SESSION_KEY = 'healthcare-suite.runtime-demo'
function demoRuntimeRequested(){
  try{
    if(typeof window==='undefined') return false
    const params=new URLSearchParams(window.location.search)
    if(params.get('demo')==='1') window.sessionStorage?.setItem(DEMO_RUNTIME_SESSION_KEY,'true')
    return window.sessionStorage?.getItem(DEMO_RUNTIME_SESSION_KEY)==='true'
  }catch{return false}
}

// A production deployment may expose an isolated Demo entry. Demo runs only in
// browser-local storage and never talks to the configured Supabase data layer.
export const IS_DEMO_RUNTIME = demoRuntimeRequested()
export const APP_MODE = IS_DEMO_RUNTIME ? 'demo' : DEPLOYMENT_MODE
export const IS_PRODUCTION = APP_MODE === 'production'
export const IS_DEMO = !IS_PRODUCTION
export const CAN_ENTER_DEMO = true
export const DEMO_RUNTIME_KEY = DEMO_RUNTIME_SESSION_KEY

export const AUTH_PROVIDER = RAW_AUTH_PROVIDER
export const DATA_PROVIDER = RAW_DATA_PROVIDER
export const SUPABASE_URL = NORMALIZED_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY = RAW_SUPABASE_KEY
export const AUTH_REDIRECT_URL = String(import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim()

// Client-side idle protection complements the provider session lifetime.
// Production defaults to 30 minutes; deployment can choose a different value.
const RAW_IDLE_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES || 30)
export const SESSION_IDLE_MINUTES = Number.isFinite(RAW_IDLE_MINUTES) ? Math.min(Math.max(RAW_IDLE_MINUTES, 5), 240) : 30
export const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000

export function runtimeSummary() {
  return {
    mode: APP_MODE,
    deploymentMode: DEPLOYMENT_MODE,
    demoRuntime: IS_DEMO_RUNTIME,
    authProvider: AUTH_PROVIDER || (IS_DEMO ? 'demo-session' : 'unconfigured'),
    dataProvider: DATA_PROVIDER || (IS_DEMO ? 'browser-local' : 'unconfigured'),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
    sessionIdleMinutes: SESSION_IDLE_MINUTES,
  }
}

export function persistenceRuntimeLabel(){
  return IS_PRODUCTION && Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
    ? 'supabase'
    : 'browser-local'
}
