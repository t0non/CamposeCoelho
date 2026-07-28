import Link from 'next/link'
import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'

export const metadata: Metadata = { title: 'Página não encontrada' }

/**
 * Página 404 — not found.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <SearchX className="h-16 w-16 text-gray-300" aria-hidden="true" />
      <div className="space-y-2">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Página não encontrada
        </h1>
        <p className="text-gray-500 max-w-md">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Voltar para o início
      </Link>
    </div>
  )
}
