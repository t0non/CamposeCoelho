'use client'

import { useState } from 'react'
import { Edit2, CheckCircle2, ShieldCheck, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FullRegistrationData } from '@/types/registration.types'

interface RegistrationReviewProps {
  data: FullRegistrationData
  onEditStep: (step: number) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting?: boolean
}

export function RegistrationReview({
  data,
  onEditStep,
  onSubmit,
  onBack,
  isSubmitting = false,
}: RegistrationReviewProps) {
  // Mascaramento parcial seguro para exibição na revisão
  const maskedCnpj = data.company.cnpj
    ? data.company.cnpj.replace(/^(\d{2})\.(\d{3})/, 'XX.XXX')
    : 'Não informado'

  const maskedCpf = data.responsible.cpf
    ? data.responsible.cpf.replace(/^(\d{3})\.(\d{3})/, 'XXX.XXX')
    : 'Não informado'

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 7 — Revisão do Cadastro</h2>
        <p className="text-xs text-slate-500">
          Confira todas as informações fornecidas antes de realizar o envio demonstrativo do cadastro.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <span>Aviso do Modo de Demonstração</span>
        </div>
        <p className="text-amber-700">
          Este envio gerará um protocolo demonstrativo. A gravação definitiva no Supabase será ativada quando o banco de dados estiver conectado.
        </p>
      </div>

      {/* Bloco 1: Empresa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Dados da Empresa</h3>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <p><strong>CNPJ:</strong> {maskedCnpj}</p>
          <p><strong>Razão Social:</strong> {data.company.companyName}</p>
          <p><strong>Nome Fantasia:</strong> {data.company.tradingName}</p>
          <p>
            <strong>Inscrição Estadual:</strong>{' '}
            {data.company.isStateRegistrationExempt ? 'Isento' : data.company.stateRegistration}
          </p>
          <p><strong>Segmento:</strong> {data.company.segment}</p>
          <p><strong>Tipo de Negócio:</strong> {data.company.businessType}</p>
          <p><strong>E-mail Comercial:</strong> {data.company.email}</p>
          <p><strong>Telefone Comercial:</strong> {data.company.phone}</p>
          <p><strong>WhatsApp Comercial:</strong> {data.company.whatsapp}</p>
        </div>
      </div>

      {/* Bloco 2: Responsável */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. Responsável pela Conta</h3>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <p><strong>Nome Completo:</strong> {data.responsible.fullName}</p>
          <p><strong>CPF:</strong> {maskedCpf}</p>
          <p><strong>Cargo:</strong> {data.responsible.role}</p>
          <p><strong>E-mail:</strong> {data.responsible.email}</p>
          <p><strong>Telefone:</strong> {data.responsible.phone}</p>
          <p><strong>WhatsApp:</strong> {data.responsible.whatsapp}</p>
          <p className="text-slate-400"><strong>Senha:</strong> •••••••• (Oculta por segurança)</p>
        </div>
      </div>

      {/* Bloco 3: Endereços */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">3. Endereços da Empresa</h3>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-700">
          <div>
            <p className="font-bold text-slate-900 mb-0.5">Endereço Fiscal:</p>
            <p>
              {data.addresses.fiscal.street}, {data.addresses.fiscal.number}{' '}
              {data.addresses.fiscal.complement ? `- ${data.addresses.fiscal.complement}` : ''} -{' '}
              {data.addresses.fiscal.neighborhood}, {data.addresses.fiscal.city}/{data.addresses.fiscal.state} - CEP{' '}
              {data.addresses.fiscal.cep}
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-900 mb-0.5">Endereço de Entrega:</p>
            <p>
              {data.addresses.isShippingSameAsFiscal
                ? 'Mesmo endereço fiscal'
                : `${data.addresses.shipping.street}, ${data.addresses.shipping.number} - ${data.addresses.shipping.city}/${data.addresses.shipping.state}`}
            </p>
          </div>
        </div>
      </div>

      {/* Bloco 4: Documentos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            4. Documentos Anexados ({data.documents.length})
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
        </div>

        {data.documents.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum documento anexado.</p>
        ) : (
          <ul className="space-y-1 text-xs text-slate-700">
            {data.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span>{doc.fileName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloco 5: Interesses */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">5. Interesses Comerciais</h3>
          <button
            type="button"
            onClick={() => onEditStep(5)}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <p><strong>Categorias:</strong> {data.interests.categories.join(', ')}</p>
          <p><strong>Frequência Estimada:</strong> {data.interests.purchaseFrequency}</p>
          <p><strong>Valor Médio por Pedido:</strong> {data.interests.averageOrderValue}</p>
          <p><strong>Canal de Vendas:</strong> {data.interests.salesChannel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Voltar aos Consentimentos</span>
        </Button>

        <Button
          type="button"
          variant="accent"
          loading={isSubmitting}
          onClick={onSubmit}
          className="px-8 font-bold"
        >
          <Send className="h-4 w-4 mr-1" />
          <span>Enviar Cadastro (Demonstração)</span>
        </Button>
      </div>
    </div>
  )
}
