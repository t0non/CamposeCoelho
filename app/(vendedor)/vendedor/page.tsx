import type { Metadata } from 'next'
import { requireSellerOrAdmin } from '@/lib/supabase/auth'
import { LogoutButton } from '@/components/auth/logout-button'

export const metadata: Metadata = { title: 'Painel do Vendedor' }

export default async function VendedorDashboardPage() {
  const ctx = await requireSellerOrAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do Vendedor</h1>
          <p className="text-gray-500">Bem-vindo(a), {ctx.user?.full_name ?? ctx.user?.email}</p>
        </div>
        <div className="w-36">
          <LogoutButton />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Informações da Conta</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24">Nome:</dt>
            <dd className="text-gray-900 font-medium">{ctx.user?.full_name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24">E-mail:</dt>
            <dd className="text-gray-900 font-medium">{ctx.user?.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24">Função:</dt>
            <dd className="text-gray-900 font-medium">{ctx.user?.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
