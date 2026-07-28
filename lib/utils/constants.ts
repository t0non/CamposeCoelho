// ============================================================
// Constantes globais da aplicação
// ============================================================

// Pedido mínimo em reais
export const MINIMUM_ORDER_VALUE = 500

// Número máximo de itens no carrinho
export const MAX_CART_ITEMS = 100

// Rotas públicas (não exigem autenticação)
export const PUBLIC_ROUTES = [
  '/',
  '/catalogo',
  '/login',
  '/cadastro',
  '/recuperar-senha',
] as const

// Rotas que exigem usuário aprovado (customer approved, seller ou admin)
export const APPROVED_ROUTES = [
  '/carrinho',
  '/checkout',
] as const

// Rotas que exigem autenticação (qualquer role)
export const AUTH_ROUTES = [
  '/minha-conta',
] as const

// Rotas exclusivas para admin
export const ADMIN_ROUTES = [
  '/admin',
] as const

// Status de empresa com labels em português
export const COMPANY_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando Aprovação',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  suspended: 'Suspenso',
}

// Status de pedido com labels em português
export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Em Processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

// Siglas dos estados brasileiros
export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type BRState = (typeof BR_STATES)[number]
