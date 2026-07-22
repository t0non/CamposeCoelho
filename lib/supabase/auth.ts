import { createClient } from '@/lib/supabase/server'
import type { AuthContext, UserCompany, UserProfile } from '@/types/auth.types'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Pick<
  Database['public']['Tables']['companies']['Row'],
  'id' | 'cnpj' | 'company_name' | 'trade_name' | 'status' | 'seller_id'
>

/**
 * Resolve o contexto de autenticação completo no servidor.
 *
 * Usa getUser() para validação segura da sessão —
 * não depende apenas de getSession(), que pode ser manipulado no cliente.
 *
 * Retorna AuthContext com user=null para visitantes não autenticados.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()

  // getUser() valida o JWT no servidor — mais seguro que getSession()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      user: null,
      company: null,
      canViewPrices: false,
      canOrder: false,
    }
  }

  // Buscar perfil
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profileData) {
    return {
      user: null,
      company: null,
      canViewPrices: false,
      canOrder: false,
    }
  }

  const profile = profileData as ProfileRow

  const userProfile: UserProfile = {
    id: profile.id,
    role: profile.role,
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    company_id: profile.company_id,
    email: user.email ?? profile.email ?? '',
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }

  // Admin e seller têm acesso completo sem empresa
  if (profile.role === 'admin' || profile.role === 'seller') {
    return {
      user: userProfile,
      company: null,
      canViewPrices: true,
      canOrder: true,
    }
  }

  // Para customers, verificar empresa
  if (!profile.company_id) {
    return {
      user: userProfile,
      company: null,
      canViewPrices: false,
      canOrder: false,
    }
  }

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, cnpj, company_name, trade_name, status, seller_id')
    .eq('id', profile.company_id)
    .single()

  if (companyError || !companyData) {
    return {
      user: userProfile,
      company: null,
      canViewPrices: false,
      canOrder: false,
    }
  }

  const userCompany = companyData as UserCompany
  const isApproved = userCompany.status === 'approved'

  return {
    user: userProfile,
    company: userCompany,
    canViewPrices: isApproved,
    canOrder: isApproved,
  }
}

/**
 * Versão que lança um erro se não houver usuário autenticado.
 * Use em Server Actions e Route Handlers que exigem autenticação.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    throw new Error('UNAUTHORIZED')
  }
  return ctx
}

/**
 * Exige que o usuário seja admin.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (ctx.user?.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return ctx
}

/**
 * Exige que o usuário seja customer aprovado, seller ou admin.
 */
export async function requireApprovedAccess(): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!ctx.canViewPrices) {
    throw new Error('FORBIDDEN')
  }
  return ctx
}
