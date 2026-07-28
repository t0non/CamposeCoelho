import { type NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/proxy-client'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

/**
 * proxy.ts — Next.js 16 substituto do middleware.ts
 *
 * Responsabilidades:
 * 1. Atualizar a sessão Supabase no cookie a cada request
 * 2. Proteger rotas privadas (redirecionar visitantes)
 * 3. Redirecionar usuários autenticados de rotas auth (login/cadastro)
 *    para o destino correto de acordo com role e status
 * 4. Redirecionar clientes pendentes ou recusados para telas de aviso
 * 5. Bloquear acesso admin para não-admins
 * 6. Bloquear acesso a /vendedor para não-sellers (exceto admin)
 * 7. Prevenir open redirect via safeRedirectPath()
 *
 * IMPORTANTE: O proxy faz proteção inicial. Os layouts e páginas privadas
 * realizam validação adicional no servidor. Nunca confiar apenas no proxy.
 */

/**
 * Sanitiza um caminho de redirect para prevenir open redirect.
 * Aceita somente caminhos internos iniciados por uma única barra.
 */
function safeRedirectPath(
  path: string | null | undefined,
  fallback: string = '/',
): string {
  if (!path || typeof path !== 'string') return fallback
  if (path.trim() === '') return fallback

  // Rejeitar qualquer string com protocolo (http:, https:, javascript:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(path)) return fallback

  // Rejeitar protocol-relative URLs (//)
  if (path.startsWith('//')) return fallback

  // Deve começar com /
  if (!path.startsWith('/')) return fallback

  return path
}

/**
 * Verifica se um caminho de redirect é permitido para o role/status do usuário.
 * Previne que um customer use redirect=/admin, etc.
 */
function isRedirectAllowedForRole(
  redirectPath: string,
  role: string,
  companyStatus: string | null,
): boolean {
  if (role === 'admin') return true

  if (role === 'seller') {
    return !redirectPath.startsWith('/admin')
  }

  if (role === 'customer') {
    if (
      companyStatus === 'pending' ||
      companyStatus === 'rejected' ||
      companyStatus === 'suspended'
    ) {
      return (
        redirectPath === '/conta-pendente' ||
        redirectPath === '/conta-recusada'
      )
    }
    return (
      !redirectPath.startsWith('/admin') &&
      !redirectPath.startsWith('/vendedor')
    )
  }

  return false
}

/**
 * Retorna o destino padrão do usuário autenticado com base em role e status.
 */
function getDefaultDestination(
  role: string,
  companyStatus: string | null,
): string {
  if (role === 'admin') return '/admin'
  if (role === 'seller') return '/vendedor'
  if (role === 'customer') {
    if (companyStatus === 'approved') return '/minha-conta'
    if (companyStatus === 'pending') return '/conta-pendente'
    return '/conta-recusada'
  }
  return '/'
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createProxyClient(request, response)

  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.headers.get('authorization')?.startsWith('Bearer ')) {
    const token = request.headers.get('authorization')!.replace('Bearer ', '')
    const { data } = await supabase.auth.getUser(token)
    user = data.user
  }

  const { pathname } = request.nextUrl

  // ──────────────────────────────────────────────────────
  // Rotas de status — exigem autenticação, mas não role específica
  // ──────────────────────────────────────────────────────
  if (pathname === '/conta-pendente' || pathname === '/conta-recusada') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // ──────────────────────────────────────────────────────
  // Proteção de rotas administrativas (/admin/*)
  // ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const safeNext = safeRedirectPath(pathname)
      redirectUrl.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(redirectUrl)
    }

    // Verificação leve no proxy — layout faz verificação completa
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as Pick<ProfileRow, 'role'> | null)?.role

    console.log('[proxy.ts] /admin access check:', { userId: user.id, role, profileData })

    if (role !== 'admin') {
      // Redireciona para o destino correto sem expor o motivo
      console.log('[proxy.ts] Redirecting to / because role is not admin')
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  // ──────────────────────────────────────────────────────
  // Proteção de rotas do vendedor (/vendedor/*)
  // ──────────────────────────────────────────────────────
  if (pathname.startsWith('/vendedor')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const safeNext = safeRedirectPath(pathname)
      redirectUrl.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(redirectUrl)
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as Pick<ProfileRow, 'role'> | null)?.role

    // Apenas seller e admin podem acessar /vendedor
    if (role !== 'seller' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  // ──────────────────────────────────────────────────────
  // Proteção de rotas autenticadas da conta e checkout
  // ──────────────────────────────────────────────────────
  if (
    pathname.startsWith('/minha-conta') ||
    pathname.startsWith('/carrinho') ||
    pathname.startsWith('/checkout')
  ) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const safeNext = safeRedirectPath(pathname)
      redirectUrl.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(redirectUrl)
    }

    // Verificar status da empresa para clientes
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as Pick<ProfileRow, 'role' | 'company_id'> | null

    if (profile?.role === 'customer' && profile?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('status')
        .eq('id', profile.company_id)
        .single()

      const company = companyData as Pick<CompanyRow, 'status'> | null

      if (company?.status === 'pending') {
        return NextResponse.redirect(new URL('/conta-pendente', request.url))
      }
      if (company?.status === 'rejected' || company?.status === 'suspended') {
        return NextResponse.redirect(new URL('/conta-recusada', request.url))
      }
    }

    return response
  }

  // ──────────────────────────────────────────────────────
  // Redireciona usuários autenticados fora das telas de auth pública
  // O redirecionamento respeita role e status — não usa redirect param aqui
  // para evitar que o proxy seja contornado por parâmetros maliciosos.
  // ──────────────────────────────────────────────────────
  if (
    user &&
    (pathname === '/login' ||
      pathname === '/cadastro' ||
      pathname === '/recuperar-senha')
  ) {
    // Buscar role e status para destino correto
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as Pick<ProfileRow, 'role' | 'company_id'> | null

    if (!profile) {
      // Perfil ausente — não redireciona, deixa o usuário no login
      return response
    }

    let companyStatus: string | null = null

    if (profile.role === 'customer' && profile.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('status')
        .eq('id', profile.company_id)
        .single()

      companyStatus = (companyData as Pick<CompanyRow, 'status'> | null)?.status ?? null
    }

    const destination = getDefaultDestination(profile.role, companyStatus)

    // Verificar se existe um redirect param seguro e compatível com o role
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    const safePath = safeRedirectPath(redirectParam)

    if (
      safePath !== '/' &&
      isRedirectAllowedForRole(safePath, profile.role, companyStatus)
    ) {
      return NextResponse.redirect(new URL(safePath, request.url))
    }

    return NextResponse.redirect(new URL(destination, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
