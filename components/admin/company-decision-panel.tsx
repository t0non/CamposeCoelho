'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, UserCheck, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { approveCompanyAction, rejectCompanyAction, assignSellerAction } from '@/app/actions/company'

interface SellerOption {
  id: string
  full_name: string
  email: string
}

interface CompanyDecisionPanelProps {
  companyId: string
  currentStatus: string
  currentSellerId: string | null
  currentReason: string | null
  currentNotes: string | null
  sellers: SellerOption[]
}

export function CompanyDecisionPanel({
  companyId,
  currentStatus,
  currentSellerId,
  currentReason,
  currentNotes,
  sellers,
}: CompanyDecisionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [selectedSeller, setSelectedSeller] = useState<string>(currentSellerId || '')
  const [rejectionReason, setRejectionReason] = useState<string>(currentReason || '')
  const [internalNotes, setInternalNotes] = useState<string>(currentNotes || '')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const handleApprove = async () => {
    if (!confirm('Confirmar a APROVAÇÃO desta empresa? O cliente terá acesso liberado aos preços e pedidos.')) {
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await approveCompanyAction(companyId, internalNotes)
      setSuccessMsg('Empresa aprovada com sucesso!')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao aprovar empresa.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      setErrorMsg('Informe um motivo público de recusa claro (mínimo 5 caracteres).')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await rejectCompanyAction(companyId, rejectionReason, internalNotes)
      setSuccessMsg('Empresa recusada. O cliente foi notificado com a mensagem pública.')
      setShowRejectForm(false)
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao recusar empresa.')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignSeller = async () => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await assignSellerAction(companyId, selectedSeller || null)
      setSuccessMsg('Vendedor atribuído com sucesso!')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao atribuir vendedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-blue-600" />
        <span>Painel de Decisão Comercial (Administrador)</span>
      </h2>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 font-semibold border border-red-200">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700 font-semibold border border-green-200">
          {successMsg}
        </div>
      )}

      {/* Atribuição de Vendedor */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-700">Vendedor Responsável pela Carteira:</label>
        <div className="flex items-center gap-3">
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 p-2 text-xs font-medium outline-none"
          >
            <option value="">Nenhum vendedor atribuído (Sem carteira)</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.email})
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAssignSeller}
            loading={loading}
            className="text-xs font-bold"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1 text-blue-600" />
            <span>Atribuir</span>
          </Button>
        </div>
      </div>

      {/* Observação Interna (Apenas Admin) */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-700">Observação Interna (Visível apenas para administradores):</label>
        <textarea
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Ex: Análise de crédito pré-aprovada até R$ 50.000,00..."
          className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none focus:border-blue-500"
        />
      </div>

      {/* Ações de Aprovação ou Recusa */}
      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
        {currentStatus !== 'approved' && (
          <Button
            type="button"
            onClick={handleApprove}
            loading={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Aprovar Empresa</span>
          </Button>
        )}

        {currentStatus !== 'rejected' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowRejectForm(!showRejectForm)}
            className="border-red-200 text-red-700 hover:bg-red-50 font-bold"
          >
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            <span>Recusar Cadastro...</span>
          </Button>
        )}
      </div>

      {/* Formulário de Recusa com Mensagem Pública */}
      {showRejectForm && (
        <form onSubmit={handleReject} className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
          <h3 className="text-xs font-bold text-red-900">Mensagem Pública de Recusa (Visível ao cliente):</h3>
          <textarea
            rows={3}
            required
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Informe claramente o motivo da recusa ou as correções necessárias (ex: Contrato social desatualizado ou Inscrição Estadual inapta...)"
            className="w-full rounded-lg border border-red-300 bg-white p-2.5 text-xs outline-none focus:border-red-500"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectForm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Confirmar Recusa
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
