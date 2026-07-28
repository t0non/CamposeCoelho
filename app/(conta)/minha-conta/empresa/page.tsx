import type { Metadata } from 'next'
import { getAuthContext } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { maskCNPJ, maskPhone, maskCEP } from '@/lib/utils/masks'
import { COMPANY_STATUS_LABELS } from '@/lib/utils/constants'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { AlertCircle, Building2, CheckCircle2, Clock } from 'lucide-react'
import { ResubmitCompanyButton } from '@/components/company/resubmit-company-button'

export const metadata: Metadata = { title: 'Dados da Empresa | Minha Conta' }

const statusVariant: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  suspended: 'danger',
}

export default async function EmpresaPage() {
  const ctx = await getAuthContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let addressData: any = null
  let fullCompanyData: any = null

  if (ctx.user?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', ctx.user.company_id)
      .single()

    fullCompanyData = company

    const { data: address } = await supabase
      .from('addresses')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .single()

    addressData = address
  }

  if (!fullCompanyData) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center space-y-3">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h1 className="text-xl font-bold text-gray-900">Nenhuma Empresa Cadastrada</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Você ainda não vinculou os dados empresariais da sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dados da Empresa</h1>
          <p className="mt-1 text-sm text-gray-500">
            Informações cadastrais e endereço comercial da sua empresa.
          </p>
        </div>
        <Badge variant={statusVariant[fullCompanyData.status] ?? 'default'} className="px-3 py-1 text-sm font-semibold">
          {COMPANY_STATUS_LABELS[fullCompanyData.status] || fullCompanyData.status}
        </Badge>
      </div>

      {/* Alerta de Empresa Recusada */}
      {fullCompanyData.status === 'rejected' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-red-900">Cadastro Necessita de Correções</h2>
              <p className="text-sm text-red-800">
                <span className="font-semibold">Motivo informado pela equipe comercial:</span>{' '}
                {fullCompanyData.rejection_reason || 'Identificamos divergências nos dados encaminhados.'}
              </p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <ResubmitCompanyButton />
          </div>
        </div>
      )}

      {/* Alerta de Empresa Pendente */}
      {fullCompanyData.status === 'pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Seu cadastro está em processo de análise cadastral e comercial pela nossa equipe.
          </p>
        </div>
      )}

      {/* Alerta de Empresa Aprovada */}
      {fullCompanyData.status === 'approved' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Sua conta empresarial está aprovada! Você possui acesso liberado aos preços de atacado.
          </p>
        </div>
      )}

      {/* Dados Cadastrais */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3">Informações Gerais</h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500 font-medium">Razão Social</dt>
            <dd className="font-bold text-gray-900 mt-0.5">{fullCompanyData.company_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">Nome Fantasia</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{fullCompanyData.trade_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">CNPJ</dt>
            <dd className="font-mono font-bold text-gray-900 mt-0.5">{maskCNPJ(fullCompanyData.cnpj)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">Inscrição Estadual</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{fullCompanyData.state_registration || 'Isento / Não informado'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">E-mail Comercial</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{fullCompanyData.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">Telefone / Celular</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {fullCompanyData.phone ? maskPhone(fullCompanyData.phone) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">Ramo / Segmento</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{fullCompanyData.segment || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 font-medium">Data do Envio</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {fullCompanyData.submitted_at
                ? new Date(fullCompanyData.submitted_at).toLocaleDateString('pt-BR')
                : new Date(fullCompanyData.created_at).toLocaleDateString('pt-BR')}
            </dd>
          </div>
        </dl>
      </section>

      {/* Endereço Comercial */}
      {addressData && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3">Endereço Comercial</h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500 font-medium">Logradouro</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">
                {addressData.street}, {addressData.number} {addressData.complement ? `— ${addressData.complement}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">Bairro</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{addressData.neighborhood}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">Cidade / UF</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {addressData.city} / {addressData.state}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">CEP</dt>
              <dd className="font-mono font-medium text-gray-900 mt-0.5">{maskCEP(addressData.zip_code)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}
