import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Fallback values keep the module loadable before .env.local exists.
// App checks isSupabaseConfigured and renders setup instructions instead
// of using the client, so these are never actually hit.
export const supabase = createClient(
  url || 'https://not-configured.supabase.co',
  anonKey || 'not-configured',
)
