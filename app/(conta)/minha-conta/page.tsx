import type { Metadata } from 'next'
import { getAuthContext } from '@/lib/supabase/auth'
import { COMPANY_STATUS_LABELS } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Minha Conta' }

const statusVariant: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  suspended: 'danger',
}

export default async function MinhaContaPage() {
  const ctx = await getAuthContext()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
        <p className="mt-1 text-gray-500">Gerencie seus dados e pedidos.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Dados do Usuário
        </h2>
        <dl className="space-y-3">
          <div className="flex gap-3">
            <dt className="w-32 text-sm text-gray-500">Nome:</dt>
            <dd className="text-sm text-gray-800">
              {ctx.user?.full_name ?? '—'}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 text-sm text-gray-500">E-mail:</dt>
            <dd className="text-sm text-gray-800">{ctx.user?.email}</dd>
          </div>
          {ctx.company && (
            <>
              <div className="flex gap-3">
                <dt className="w-32 text-sm text-gray-500">Empresa:</dt>
                <dd className="text-sm text-gray-800">
                  {ctx.company.company_name}
                </dd>
              </div>
              <div className="flex gap-3 items-center">
                <dt className="w-32 text-sm text-gray-500">Status:</dt>
                <dd>
                  <Badge variant={statusVariant[ctx.company.status] ?? 'default'}>
                    {COMPANY_STATUS_LABELS[ctx.company.status]}
                  </Badge>
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
