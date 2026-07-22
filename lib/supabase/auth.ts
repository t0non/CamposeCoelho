import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
 * Se o usuário existe mas o perfil não, encerra a sessão para evitar
 * estados inconsistentes.
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

  // Se o usuário existe no Auth mas não tem perfil, encerra a sessão para
  // evitar loop entre login e dashboard. Retorna estado de não autenticado.
  if (profileError || !profileData) {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignora erro de signOut — o importante é não deixar estado inconsistente
    }
    return {
      user: null,
      company: null,
      canViewPrices: false,
      canOrder: false,
      profileMissing: true,
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
 * Retorna o destino correto do usuário após o login, baseado em role e status.
 * Função centralizada para evitar lógica duplicada no login e no proxy.
 */
export function getAuthenticatedDestination(ctx: AuthContext): string {
  if (!ctx.user) return '/login'

  const role = ctx.user.role

  if (role === 'admin') return '/admin'
  if (role === 'seller') return '/vendedor'

  if (role === 'customer') {
    const status = ctx.company?.status
    if (status === 'approved') return '/minha-conta'
    if (status === 'pending') return '/conta-pendente'
    if (status === 'rejected' || status === 'suspended') return '/conta-recusada'
    // customer sem empresa — vai para conta-pendente como fallback
    return '/conta-pendente'
  }

  return '/'
}

/**
 * Valida se um caminho de redirect é seguro para uso interno.
 * Previne open redirect.
 *
 * Regras:
 * - Deve começar com /
 * - Não pode começar com //
 * - Não pode conter :// (URLs absolutas)
 * - Não pode conter protocolos perigosos
 * - Não pode ser vazio
 */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string = '/',
): string {
  if (!path || typeof path !== 'string') return fallback

  // Rejeitar vazio
  if (path.trim() === '') return fallback

  // Rejeitar URLs absolutas com protocolo
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(path)) return fallback

  // Rejeitar // (protocol-relative URLs)
  if (path.startsWith('//')) return fallback

  // Deve começar com /
  if (!path.startsWith('/')) return fallback

  return path
}

/**
 * Valida se o redirect param é compatível com o role/status do usuário.
 * Previne que um customer use redirect=/admin, etc.
 */
export function isRedirectAllowedForContext(
  redirectPath: string,
  ctx: AuthContext,
): boolean {
  if (!ctx.user) return false

  const role = ctx.user.role
  const status = ctx.company?.status

  // Admin pode ir a qualquer rota interna
  if (role === 'admin') return true

  // Seller não pode ser enviado para admin
  if (role === 'seller') {
    return !redirectPath.startsWith('/admin')
  }

  // Customer pending/rejected não acessa rotas privadas de cliente
  if (role === 'customer') {
    if (status === 'pending' || status === 'rejected' || status === 'suspended') {
      // Só pode ir para conta-pendente ou conta-recusada
      return (
        redirectPath === '/conta-pendente' ||
        redirectPath === '/conta-recusada'
      )
    }
    // Customer approved não pode acessar admin ou vendedor
    return (
      !redirectPath.startsWith('/admin') &&
      !redirectPath.startsWith('/vendedor')
    )
  }

  return false
}

/**
 * Versão que lança um erro se não houver usuário autenticado.
 * Use em Server Actions e Route Handlers que exigem autenticação.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    redirect('/login')
  }
  return ctx
}

/**
 * Exige que o usuário seja admin.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    redirect('/login')
  }
  if (ctx.user!.role !== 'admin') {
    redirect(getAuthenticatedDestination(ctx))
  }
  return ctx
}

/**
 * Exige que o usuário seja seller.
 */
export async function requireSeller(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    redirect('/login')
  }
  if (ctx.user!.role !== 'seller') {
    redirect(getAuthenticatedDestination(ctx))
  }
  return ctx
}

/**
 * Exige que o usuário seja seller ou admin.
 * Usado para o dashboard do vendedor (admin pode visualizar por decisão explícita).
 */
export async function requireSellerOrAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    redirect('/login')
  }
  const role = ctx.user!.role
  if (role !== 'seller' && role !== 'admin') {
    redirect(getAuthenticatedDestination(ctx))
  }
  return ctx
}

/**
 * Exige que o usuário seja customer aprovado, seller ou admin.
 */
export async function requireApprovedAccess(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    redirect('/login')
  }
  if (!ctx.canViewPrices) {
    redirect(getAuthenticatedDestination(ctx))
  }
  return ctx
}
