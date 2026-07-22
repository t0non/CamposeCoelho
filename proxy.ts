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
 * 4. Redirecionar clientes pendentes ou recusados para telas de aviso
 * 5. Bloquear acesso admin para não-admins
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createProxyClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas isentas de redirecionamento por status
  if (pathname === '/conta-pendente' || pathname === '/conta-recusada') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Proteção de rotas administrativas
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  // Proteção de rotas autenticadas da conta e checkout
  if (pathname.startsWith('/minha-conta') || pathname.startsWith('/carrinho') || pathname.startsWith('/checkout')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', pathname)
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

  // Redireciona usuários autenticados longe das telas de auth pública
  if (
    user &&
    (pathname === '/login' ||
      pathname === '/cadastro' ||
      pathname === '/recuperar-senha')
  ) {
    return NextResponse.redirect(new URL('/minha-conta', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
