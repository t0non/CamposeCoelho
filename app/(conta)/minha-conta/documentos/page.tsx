import type { Metadata } from 'next'
import { getAuthContext } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { FileCheck, FileText, AlertCircle, Clock, ShieldCheck } from 'lucide-react'
import { ViewDocumentButton } from '@/components/company/view-document-button'

export const metadata: Metadata = { title: 'Documentos Empresariais | Minha Conta' }

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
  doc_responsavel: 'Documento do Responsável (RG/CNH)',
  comprovante_endereco: 'Comprovante de Endereço',
  inscricao_estadual: 'Inscrição Estadual',
  outros: 'Outros Documentos',
}

export default async function DocumentosPage() {
  const ctx = await getAuthContext()
  const supabase = await createClient()

  let docs: any[] = []

  if (ctx.user?.company_id) {
    const { data } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .order('created_at', { ascending: false })

    docs = data || []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos Empresariais</h1>
        <p className="mt-1 text-sm text-gray-500">
          Acompanhe o status e a validação dos documentos comprobatórios enviados.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Armazenamento Seguro de Documentos</p>
          <p className="text-blue-700">
            Seus arquivos estão salvos em armazenamento privado criptografado. A visualização ocorre apenas sob demanda via link seguro temporário.
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center space-y-3">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="text-base font-bold text-gray-900">Nenhum documento anexado</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Não há documentos registrados para a sua empresa.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          {docs.map((doc) => (
            <div key={doc.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 shrink-0 mt-0.5">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-gray-900 truncate">{doc.file_name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-blue-700">
                      {docCategoryLabels[doc.document_type] || doc.document_type}
                    </span>
                    <span>•</span>
                    <span>Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-red-600 font-medium">
                      Nota de análise: {doc.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={docStatusVariant[doc.status] ?? 'default'} className="px-2.5 py-0.5 text-xs font-semibold">
                  {docStatusLabels[doc.status] || doc.status}
                </Badge>

                {doc.file_path && (
                  <ViewDocumentButton filePath={doc.file_path} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
