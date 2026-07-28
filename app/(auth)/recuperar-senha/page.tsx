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
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="mb-8 text-center">
          <a href="/" className="inline-block">
            <span className="text-2xl font-bold text-gray-900">
              Atacado<span className="text-blue-600">B2B</span>
            </span>
          </a>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
          <RecuperarSenhaContent />
        </Suspense>
      </div>
    </div>
  )
}
