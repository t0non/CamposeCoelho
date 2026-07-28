import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RecuperarSenhaContent } from '@/components/auth/recuperar-senha-content'

export const metadata: Metadata = {
  title: 'Recuperar Senha',
}

/**
 * Página de recuperação de senha.
 *
 * Comportamento:
 * - Sem parâmetros → exibe ForgotPasswordForm (solicita o e-mail)
 * - Com ?type=recovery → exibe ResetPasswordForm (define a nova senha)
 *
 * O Supabase redireciona para esta página após o usuário clicar no link
 * de recuperação. O callback /api/auth/callback trata o código e
 * redireciona aqui com type=recovery.
 */
export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
      <RecuperarSenhaContent />
    </Suspense>
  )
}
