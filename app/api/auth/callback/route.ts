import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Callback do Supabase Auth para OAuth, magic links e recuperação de senha.
 * Troca o código de autorização por uma sessão.
 *
 * Fluxos suportados:
 * - OAuth/magic link: redireciona para `next` (default: /)
 * - Recovery (type=recovery): redireciona para /recuperar-senha?type=recovery
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      // Para fluxo de recuperação de senha, redirecionar para a página de nova senha
      if (type === 'recovery') {
        const recoveryPath = '/recuperar-senha?type=recovery'
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${recoveryPath}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${recoveryPath}`)
        } else {
          return NextResponse.redirect(`${origin}${recoveryPath}`)
        }
      }

      // Para outros fluxos (OAuth, magic link), usar o `next` param
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Redireciona para login com erro se algo falhar
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
