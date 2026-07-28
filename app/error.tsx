'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Página de erro genérico (500).
 * Must be a Client Component — recebe error e reset do Next.js.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log do erro para monitoramento (Sentry, etc.)
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-amber-500" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Algo deu errado
        </h1>
        <p className="text-gray-500 max-w-md">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato se o
          problema persistir.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400">Código: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary">
          Tentar novamente
        </Button>
        <Button onClick={() => (window.location.href = '/')} variant="outline">
          Ir para o início
        </Button>
      </div>
    </div>
  )
}
