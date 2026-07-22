'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook para acesso ao usuário autenticado no cliente.
 *
 * IMPORTANTE: Este hook é usado apenas para estado de UI (ex: mostrar nome,
 * botão de logout, etc). A autorização real sempre acontece no servidor.
 * Não use dados deste hook para decisões de segurança.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Busca sessão atual
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // Escuta mudanças de sessão
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return { user, loading, signOut }
}
