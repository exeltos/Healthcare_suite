import { createClient } from '@supabase/supabase-js'

const supabaseUrl=String(import.meta.env.VITE_SUPABASE_URL||'').trim()
const supabasePublishableKey=String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim()

export const isSupabaseConfigured=Boolean(supabaseUrl&&supabasePublishableKey)

export const supabase=isSupabaseConfigured
  ? createClient(supabaseUrl,supabasePublishableKey,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true,
      },
    })
  : null

export function requireSupabase(){
  if(!supabase){
    const error=new Error('Supabase client is not configured.')
    error.code='SUPABASE_NOT_CONFIGURED'
    throw error
  }
  return supabase
}
