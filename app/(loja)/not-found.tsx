import Link from 'next/link'
import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'

export const metadata: Metadata = { title: 'Página não encontrada | Central Atacado' }

export default function LojaNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center py-16">
      <SearchX className="h-16 w-16 text-slate-300" aria-hidden="true" />
      <div className="space-y-2">
        <p className="text-6xl font-black text-slate-200">404</p>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Produto ou página não encontrada
        </h1>
        <p className="text-slate-500 max-w-md text-sm">
          O produto solicitado não está disponível, foi desativado ou o endereço está incorreto.
        </p>
      </div>
      <Link
        href="/catalogo"
        className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
      >
        Explorar o Catálogo
      </Link>
    </div>
  )
}
