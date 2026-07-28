import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cria um cliente Supabase para uso dentro do proxy.ts.
 * Responsável por atualizar a sessão no cookie a cada request.
 */
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient<Database, "public", any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient<Database, 'public'>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
      global: {
        headers: request.headers.has('authorization')
          ? { Authorization: request.headers.get('authorization')! }
          : undefined,
      },
    },
  )
}
