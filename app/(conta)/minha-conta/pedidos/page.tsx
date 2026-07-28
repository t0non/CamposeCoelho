import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Meus Pedidos' }

export default function PedidosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Meus Pedidos</h1>
      <p className="text-gray-500">Placeholder — será implementado na próxima etapa.</p>
    </div>
  )
}
