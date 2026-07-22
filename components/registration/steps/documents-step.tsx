'use client'

import { useState } from 'react'
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { DocumentItem } from '@/types/registration.types'

interface DocumentsStepProps {
  initialValues?: DocumentItem[]
  onSubmit: (documents: DocumentItem[]) => void
  onBack: () => void
}

export function DocumentsStep({ initialValues = [], onSubmit, onBack }: DocumentsStepProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialValues)
  const [selectedCategory, setSelectedCategory] = useState<DocumentItem['category']>('contrato_social')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  const maxSizeBytes = 10 * 1024 * 1024 // 10 MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validação de Tamanho
    if (file.size > maxSizeBytes) {
      setErrorMsg(`O arquivo "${file.name}" excede o limite de 10 MB.`)
      return
    }

    // Validação de Formato
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Formato inválido. Apenas PDF, JPG, JPEG e PNG são permitidos.')
      return
    }

    // Adiciona o metadado do arquivo em modo de demonstração (SEM salvar o binário)
    const newItem: DocumentItem = {
      id: `doc-${Date.now()}`,
      category: selectedCategory,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }

    setDocuments((prev) => [...prev, newItem])
    e.target.value = '' // Limpa o input de arquivo
  }

  const handleRemove = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const categoryLabels: Record<DocumentItem['category'], string> = {
    contrato_social: 'Contrato Social / EIRELI',
    cartao_cnpj: 'Cartão do CNPJ',
    doc_responsavel: 'Documento do Responsável (RG/CNH)',
    comprovante_endereco: 'Comprovante de Endereço',
    inscricao_estadual: 'Inscrição Estadual / Certidão',
    outros: 'Outros Documentos',
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 4 — Documentos da Empresa</h2>
        <p className="text-xs text-slate-500">
          Selecione os documentos comprobatórios para agilizar a análise do cadastro comercial.
        </p>
      </div>

      {/* Aviso de Segurança & Modo de Demonstração */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Ambiente Seguro SSL 256-bit (Demonstração)</span>
        </div>
        <p className="text-[11px] text-emerald-700">
          Nesta etapa de testes, os metadados dos arquivos são validados localmente. Nenhum arquivo binário é transmitido ou salvo na memória do seu navegador.
        </p>
      </div>

      {/* Seleção da Categoria & Dropzone Visual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <Select
            label="Tipo de Documento a Anexar"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DocumentItem['category'])}
            options={[
              { label: 'Contrato Social / Requerimento de Empresário', value: 'contrato_social' },
              { label: 'Cartão do CNPJ Atualizado', value: 'cartao_cnpj' },
              { label: 'Documento de Identidade do Responsável (RG/CNH)', value: 'doc_responsavel' },
              { label: 'Comprovante de Endereço Comercial', value: 'comprovante_endereco' },
              { label: 'Certidão de Inscrição Estadual', value: 'inscricao_estadual' },
              { label: 'Outros Documentos Complementares', value: 'outros' },
            ]}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Selecionar Arquivo (PDF, JPG, PNG - Máx 10MB)
            </label>
            <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-400 bg-orange-50/50 px-4 text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors">
              <Upload className="h-4 w-4" />
              <span>Escolher Arquivo</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 font-semibold border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Lista de Documentos Selecionados */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Documentos Selecionados ({documents.length}):
        </h3>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 space-y-1">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="font-semibold text-slate-600">Nenhum documento anexado ainda</p>
            <p>Selecione a categoria acima e escolha os arquivos do seu dispositivo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3.5 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white font-bold shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-orange-600">
                        {categoryLabels[doc.category]}
                      </span>
                      <span>•</span>
                      <span>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(doc.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  aria-label="Remover documento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Voltar</span>
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={() => onSubmit(documents)}
          className="px-8 font-bold"
        >
          <span>Salvar e Continuar</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
