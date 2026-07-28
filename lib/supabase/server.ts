import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './admin'

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa cookies para manter a sessão do usuário autenticado.
 */
export async function createClient(): Promise<SupabaseClient<Database, "public", any>> {
  const cookieStore = await cookies()
  const headerStore = await headers()
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
          const allCookies = cookieStore.getAll()
          const authHeader = headerStore.get('authorization')
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '')
            const cookieName = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token.0`
            const sessionStr = JSON.stringify([token, '', null, null, null])
            const b64 = Buffer.from(sessionStr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
            allCookies.push({ name: cookieName, value: b64 })
          }
          return allCookies
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Pode falhar em Server Components, mas ignoramos em leitura segura
          }
        },
      },
      global: {
        headers: headerStore.has('authorization')
          ? { Authorization: headerStore.get('authorization')! }
          : undefined,
      },
    },
  )
}

export { createAdminClient }
