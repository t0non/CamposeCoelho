import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Carrinho' }

export default function CarrinhoPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Meu Carrinho</h1>
      <p className="mt-2 text-gray-500">
        Placeholder — será implementado na próxima etapa.
      </p>
    </div>
  )
}
