const RAW_MODE = String(import.meta.env.VITE_APP_MODE || 'demo').trim().toLowerCase()

export const APP_MODE = RAW_MODE === 'production' ? 'production' : 'demo'
export const IS_PRODUCTION = APP_MODE === 'production'
export const IS_DEMO = !IS_PRODUCTION

export const AUTH_PROVIDER = String(import.meta.env.VITE_AUTH_PROVIDER || '').trim()
export const DATA_PROVIDER = String(import.meta.env.VITE_DATA_PROVIDER || '').trim()
export const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
export const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
export const AUTH_REDIRECT_URL = String(import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim()

export function runtimeSummary() {
  return {
    mode: APP_MODE,
    authProvider: AUTH_PROVIDER || (IS_DEMO ? 'demo-session' : 'unconfigured'),
    dataProvider: DATA_PROVIDER || (IS_DEMO ? 'browser-local' : 'unconfigured'),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
  }
}
