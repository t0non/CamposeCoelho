import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta na plataforma AtacadoB2B.',
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Entrar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Acesse sua conta para visualizar preços e fazer pedidos.
        </p>
      </div>
      <LoginForm />
    </>
  )
}
