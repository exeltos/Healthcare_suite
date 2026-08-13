const RAW_MODE = String(import.meta.env.VITE_APP_MODE || '').trim().toLowerCase()
const RAW_AUTH_PROVIDER = String(import.meta.env.VITE_AUTH_PROVIDER || '').trim().toLowerCase()
const RAW_DATA_PROVIDER = String(import.meta.env.VITE_DATA_PROVIDER || '').trim().toLowerCase()
const RAW_SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const RAW_SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Safety rule: a deployment configured for Supabase is always Production.
// This prevents operational Demo/default records from appearing when a Netlify
// VITE_APP_MODE variable is missing or stale.
const HAS_SUPABASE_RUNTIME =
  RAW_AUTH_PROVIDER === 'supabase' ||
  RAW_DATA_PROVIDER === 'supabase' ||
  Boolean(RAW_SUPABASE_URL && RAW_SUPABASE_KEY)

export const APP_MODE = RAW_MODE === 'production' || HAS_SUPABASE_RUNTIME ? 'production' : 'demo'
export const IS_PRODUCTION = APP_MODE === 'production'
export const IS_DEMO = !IS_PRODUCTION

export const AUTH_PROVIDER = RAW_AUTH_PROVIDER
export const DATA_PROVIDER = RAW_DATA_PROVIDER
export const SUPABASE_URL = RAW_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY = RAW_SUPABASE_KEY
export const AUTH_REDIRECT_URL = String(import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim()

export function runtimeSummary() {
  return {
    mode: APP_MODE,
    authProvider: AUTH_PROVIDER || (IS_DEMO ? 'demo-session' : 'unconfigured'),
    dataProvider: DATA_PROVIDER || (IS_DEMO ? 'browser-local' : 'unconfigured'),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
  }
}
