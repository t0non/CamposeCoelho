'use client'

import { useSearchParams } from 'next/navigation'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

/**
 * Client Component que detecta o tipo de fluxo de recuperação de senha
 * via searchParams e renderiza o formulário correto.
 */
export function RecuperarSenhaContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const isRecovery = type === 'recovery'

  if (isRecovery) {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">Definir Nova Senha</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crie uma nova senha segura para sua conta.
          </p>
        </div>
        <ResetPasswordForm />
      </>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Recuperar Senha</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informe seu e-mail e enviaremos instruções para redefinir sua senha.
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}
