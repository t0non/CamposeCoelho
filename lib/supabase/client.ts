'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase para uso exclusivo em Client Components.
 * NÃO tem acesso a dados protegidos por RLS de usuários não autenticados.
 * Nunca use a secret/service_role key aqui.
 */
export function createClient(): SupabaseClient<Database, "public", any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient<Database, 'public'>(supabaseUrl, supabaseAnonKey)
}
