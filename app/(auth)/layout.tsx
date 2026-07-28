import type { ReactNode } from 'react'

/**
 * Layout do grupo de autenticação.
 * Centraliza o formulário na tela — sem header/footer da loja.
 * Aninhado dentro do RootLayout global.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-block">
            <span className="text-2xl font-bold text-gray-900">
              Atacado<span className="text-blue-600">B2B</span>
            </span>
          </a>
        </div>

        {/* Card do formulário */}
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
