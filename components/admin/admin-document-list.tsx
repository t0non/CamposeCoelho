'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface DocumentItem {
  id: string
  document_type: string
  file_path: string
  file_name: string
  status: string
  notes: string | null
  created_at: string
}

interface AdminDocumentListProps {
  companyId: string
  documents: DocumentItem[]
}

const docStatusVariant: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}

const docStatusLabels: Record<string, string> = {
  approved: 'Aprovado',
  pending: 'Em Análise',
  rejected: 'Recusado',
}

const docCategoryLabels: Record<string, string> = {
  contrato_social: 'Contrato Social / EIRELI',
  cartao_cnpj: 'Cartão do CNPJ',
  doc_responsavel: 'Documento do Responsável',
  comprovante_endereco: 'Comprovante de Endereço',
  inscricao_estadual: 'Inscrição Estadual',
  outros: 'Outros',
}

export function AdminDocumentList({ companyId, documents }: AdminDocumentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const supabase = createClient()

  const handleView = async (filePath: string, docId: string) => {
    setLoadingId(docId)
    try {
      const { data, error } = await supabase.storage
        .from('company-documents')
        .createSignedUrl(filePath, 3600)

      if (error || !data?.signedUrl) {
        alert('Não foi possível gerar o link seguro de visualização.')
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Erro ao visualizar o documento.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleUpdateDocStatus = async (docId: string, newStatus: 'approved' | 'rejected', note?: string) => {
    setUpdatingId(docId)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('company_documents')
        .update({ status: newStatus, notes: note || null, updated_at: new Date().toISOString() })
        .eq('id', docId)

      if (error) {
        alert(`Erro ao atualizar documento: ${error.message}`)
      }
    } finally {
      setUpdatingId(null)
      // Trigger page refresh via router.refresh() is not available here, so we reload
      window.location.reload()
    }
  }

  return (
    <div className="divide-y divide-gray-100">
      {documents.map((doc) => (
        <div key={doc.id} className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-gray-900 truncate">{doc.file_name}</p>
                <p className="text-xs text-blue-700 font-medium">
                  {docCategoryLabels[doc.document_type] || doc.document_type}
                </p>
                <p className="text-xs text-gray-400">
                  Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                </p>
                {doc.notes && (
                  <p className="text-xs text-red-600 font-medium">Nota: {doc.notes}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge variant={docStatusVariant[doc.status] ?? 'default'} className="text-xs">
                {docStatusLabels[doc.status] || doc.status}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleView(doc.file_path, doc.id)}
                disabled={loadingId === doc.id}
                className="text-xs"
              >
                {loadingId === doc.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3 text-blue-600" />
                )}
                <span>Visualizar</span>
              </Button>
            </div>
          </div>

          {/* Ações de Aprovação / Recusa do Documento */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={updatingId === doc.id || doc.status === 'approved'}
              onClick={() => handleUpdateDocStatus(doc.id, 'approved')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" />
              Validar
            </button>
            <button
              type="button"
              disabled={updatingId === doc.id || doc.status === 'rejected'}
              onClick={() => {
                const note = prompt('Motivo da rejeição deste documento (visível ao cliente):')
                if (note !== null) {
                  handleUpdateDocStatus(doc.id, 'rejected', note)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="h-3 w-3" />
              Reprovar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
