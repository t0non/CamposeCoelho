import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { maskCNPJ, maskPhone, maskCEP } from '@/lib/utils/masks'
import { COMPANY_STATUS_LABELS } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { CompanyDecisionPanel } from '@/components/admin/company-decision-panel'
import { AdminDocumentList } from '@/components/admin/admin-document-list'
import { ArrowLeft, Building2, Clock, FileCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Análise de Empresa | Admin' }

interface PageProps {
  params: Promise<{ id: string }>
}

const statusVariant: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  suspended: 'danger',
}

export default async function AdminEmpresaDetailPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Buscar empresa completa
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !company) {
    notFound()
  }

  // Buscar endereço
  const { data: address } = await supabase
    .from('addresses')
    .select('*')
    .eq('company_id', id)
    .single()

  // Buscar documentos
  const { data: documents } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })

  // Buscar membros da empresa
  const { data: members } = await supabase
    .from('company_members')
    .select('id, profile_id, role, is_primary, profiles:profile_id(full_name, email, phone)')
    .eq('company_id', id)

  // Buscar vendedores disponíveis para atribuição
  const { data: sellers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'seller')
    .order('full_name')

  // Buscar audit logs desta empresa
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('target_table', 'companies')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/empresas"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à listagem
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-7 w-7 text-blue-600" />
            {company.company_name}
          </h1>
          {company.trade_name && (
            <p className="text-sm text-gray-500">({company.trade_name})</p>
          )}
        </div>
        <Badge variant={statusVariant[company.status] ?? 'default'} className="px-3 py-1.5 text-sm font-semibold shrink-0">
          {COMPANY_STATUS_LABELS[company.status] || company.status}
        </Badge>
      </div>

      {/* Grid de 2 colunas */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna principal (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Cadastrais */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3">Dados Cadastrais</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">CNPJ:</dt>
                <dd className="font-bold text-gray-900 font-mono">{maskCNPJ(company.cnpj)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Inscrição Estadual:</dt>
                <dd className="font-semibold text-gray-900">{company.state_registration || 'Isento / Não informado'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">E-mail Comercial:</dt>
                <dd className="font-semibold text-gray-900">{company.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Telefone:</dt>
                <dd className="font-semibold text-gray-900">{company.phone ? maskPhone(company.phone) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">WhatsApp:</dt>
                <dd className="font-semibold text-gray-900">{company.whatsapp ? maskPhone(company.whatsapp) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Segmento:</dt>
                <dd className="font-semibold text-gray-900">{company.segment || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Site:</dt>
                <dd className="font-semibold text-gray-900 truncate">{company.website || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Data de Submissão:</dt>
                <dd className="font-semibold text-gray-900">
                  {company.submitted_at
                    ? new Date(company.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : new Date(company.created_at).toLocaleDateString('pt-BR')}
                </dd>
              </div>
              {company.approved_at && (
                <div>
                  <dt className="text-xs text-gray-500">Data de Aprovação:</dt>
                  <dd className="font-semibold text-green-700">{new Date(company.approved_at).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
              {company.rejected_at && (
                <div>
                  <dt className="text-xs text-gray-500">Data de Recusa:</dt>
                  <dd className="font-semibold text-red-700">{new Date(company.rejected_at).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>

            {/* Motivo da recusa - visível ao admin */}
            {company.rejection_reason && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-xs font-bold text-red-800">Motivo de Recusa (Enviado ao cliente):</p>
                <p className="text-xs text-red-700">{company.rejection_reason}</p>
              </div>
            )}

            {/* Observação interna - somente admin */}
            {company.internal_notes && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
                <p className="text-xs font-bold text-gray-700">Observação Interna (Confidencial):</p>
                <p className="text-xs text-gray-600">{company.internal_notes}</p>
              </div>
            )}
          </section>

          {/* Endereço */}
          {address && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3">Endereço Comercial</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500">Logradouro:</dt>
                  <dd className="font-semibold text-gray-900">{address.street}, {address.number} {address.complement ? `— ${address.complement}` : ''}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Bairro:</dt>
                  <dd className="font-semibold text-gray-900">{address.neighborhood}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Cidade / UF:</dt>
                  <dd className="font-semibold text-gray-900">{address.city} / {address.state}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">CEP:</dt>
                  <dd className="font-semibold text-gray-900 font-mono">{maskCEP(address.zip_code)}</dd>
                </div>
              </dl>
            </section>
          )}

          {/* Responsáveis / Membros */}
          {members && members.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3">Responsáveis da Empresa</h2>
              <div className="divide-y divide-gray-100">
                {members.map((m: any) => (
                  <div key={m.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{m.profiles?.full_name || 'Nome não disponível'}</p>
                        <p className="text-xs text-gray-500">{m.profiles?.email}</p>
                        {m.profiles?.phone && <p className="text-xs text-gray-500">{maskPhone(m.profiles.phone)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.is_primary ? 'info' : 'default'} className="text-xs">
                          {m.is_primary ? 'Principal' : m.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documentos */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Documentos Comprobatórios ({documents?.length || 0})
            </h2>
            {documents && documents.length > 0 ? (
              <AdminDocumentList companyId={id} documents={documents} />
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum documento enviado.</p>
            )}
          </section>

          {/* Histórico de Auditoria */}
          {auditLogs && auditLogs.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Histórico de Auditoria
              </h2>
              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{log.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                      <p className="text-gray-400">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar de Ações (1/3) */}
        <div className="space-y-4">
          <CompanyDecisionPanel
            companyId={id}
            currentStatus={company.status}
            currentSellerId={company.seller_id}
            currentReason={company.rejection_reason}
            currentNotes={company.internal_notes}
            sellers={sellers || []}
          />
        </div>
      </div>
    </div>
  )
}
