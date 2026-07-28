import type { Database } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']
export type CompanyStatus = Database['public']['Enums']['company_status']

// Perfil completo do usuário autenticado (carregado no servidor)
export interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  avatar_url: string | null
  company_id: string | null
  email: string
  created_at: string
  updated_at: string
}

// Empresa associada ao customer
export interface UserCompany {
  id: string
  cnpj: string
  company_name: string
  trade_name: string | null
  status: CompanyStatus
  seller_id: string | null
}

// Contexto de autenticação resolvido no servidor
export interface AuthContext {
  user: UserProfile | null
  company: UserCompany | null
  /**
   * Indica se o usuário tem permissão de visualizar preços.
   * true somente para role=customer com company.status=approved,
   * role=seller ou role=admin.
   */
  canViewPrices: boolean
  /**
   * Indica se pode criar pedidos
   */
  canOrder: boolean
  /**
   * Indica que o usuário existe no Auth mas não tem perfil em public.profiles.
   * A sessão já foi encerrada quando este campo é true.
   */
  profileMissing?: boolean
}

// Guards reutilizáveis no servidor
export function isApprovedCustomer(ctx: AuthContext): boolean {
  return (
    ctx.user?.role === 'customer' &&
    ctx.company?.status === 'approved' &&
    ctx.canViewPrices
  )
}

export function isSeller(ctx: AuthContext): boolean {
  return ctx.user?.role === 'seller'
}

export function isAdmin(ctx: AuthContext): boolean {
  return ctx.user?.role === 'admin'
}

export function isPending(ctx: AuthContext): boolean {
  return (
    ctx.user?.role === 'customer' && ctx.company?.status === 'pending'
  )
}

export function isRejected(ctx: AuthContext): boolean {
  return (
    ctx.user?.role === 'customer' && ctx.company?.status === 'rejected'
  )
}

export function isSuspended(ctx: AuthContext): boolean {
  return (
    ctx.user?.role === 'customer' && ctx.company?.status === 'suspended'
  )
}
