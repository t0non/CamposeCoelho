import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { maskCNPJ } from '@/lib/utils/masks'
import { COMPANY_STATUS_LABELS } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Building2, Search, ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Gestão de Empresas | Admin' }

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>
}

const statusVariant: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  suspended: 'danger',
}

export default async function AdminEmpresasPage({ searchParams }: PageProps) {
  await requireAdmin()
  const { status, q } = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let query = supabase
    .from('companies')
    .select('id, cnpj, company_name, trade_name, status, submitted_at, created_at, seller_id')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (q) {
    query = query.or(`company_name.ilike.%${q}%,cnpj.ilike.%${q}%,trade_name.ilike.%${q}%`)
  }

  const { data: companies, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise de Empresas B2B</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie o cadastro, homologação comercial e atribuição de vendedores.
          </p>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
        <Link
          href="/admin/empresas"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !status ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </Link>
        <Link
          href="/admin/empresas?status=pending"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            status === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          Aguardando Análise (Pending)
        </Link>
        <Link
          href="/admin/empresas?status=approved"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            status === 'approved' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-800 hover:bg-green-100'
          }`}
        >
          Aprovadas
        </Link>
        <Link
          href="/admin/empresas?status=rejected"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            status === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
          }`}
        >
          Recusadas
        </Link>
      </div>

      {/* Tabela de Empresas */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {companies && companies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Razão Social / Fantasia</th>
                  <th className="px-6 py-3">CNPJ</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Data Envio</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companies.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{c.company_name}</div>
                      {c.trade_name && <div className="text-xs text-gray-500">{c.trade_name}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{maskCNPJ(c.cnpj)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[c.status] ?? 'default'} className="text-xs font-semibold">
                        {COMPANY_STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {c.submitted_at
                        ? new Date(c.submitted_at).toLocaleDateString('pt-BR')
                        : new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/empresas/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        Analisar
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <Building2 className="mx-auto h-10 w-10 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Nenhuma empresa encontrada</p>
            <p className="text-xs text-gray-500">
              {error ? `Erro ao carregar: ${error.message}` : 'Não existem cadastros para o filtro selecionado.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
