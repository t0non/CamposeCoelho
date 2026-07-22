import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Recuperar Senha',
}

export default function RecuperarSenhaPage() {
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
