import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta na plataforma AtacadoB2B.',
}

export default function LoginPage() {
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
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">Entrar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Acesse sua conta para visualizar preços e fazer pedidos.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
