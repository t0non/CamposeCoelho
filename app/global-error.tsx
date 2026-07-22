'use client'

import { useEffect } from 'react'

/**
 * Global error boundary — captura erros no layout raiz.
 * Deve ser um Client Component e incluir seu próprio <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center font-sans">
        <h1 className="text-2xl font-bold text-gray-900">Erro crítico</h1>
        <p className="text-gray-500">
          Ocorreu um erro grave na aplicação. Recarregue a página.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400">Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Recarregar
        </button>
      </body>
    </html>
  )
}
