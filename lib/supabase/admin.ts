import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase Administrativo para uso exclusivo no Servidor.
 * NUNCA importar em Client Components nem usar no navegador.
 * Utiliza exclusivamente SUPABASE_SECRET_KEY sem fallback público.
 */
export function createAdminClient(): SupabaseClient<Database, "public", any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY não configurada. Operação administrativa negada.')
  }

  return createClient<Database, 'public'>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
