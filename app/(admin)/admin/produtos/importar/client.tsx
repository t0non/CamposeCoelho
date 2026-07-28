'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { AlertCircle, Upload, CheckCircle2, FileSpreadsheet, Loader2 } from 'lucide-react'

type PriceTable = { id: string; name: string }

type ImportStats = {
  total: number
  valid: number
  warnings: number
  errors: number
  total_batches: number
}

type Step = 1 | 2 | 3 | 4 | 5

export default function ImportarPlanilhaClient({ initialPriceTables }: { initialPriceTables: PriceTable[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = 'import_update'

  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'import_update' | 'replace'>(initialMode)
  const [priceTableId, setPriceTableId] = useState<string>('')
  const [publish, setPublish] = useState(false)
  const [confirmGlobal, setConfirmGlobal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const [stats, setStats] = useState<ImportStats | null>(null)
  
  // Progress
  const [currentBatch, setCurrentBatch] = useState(0)
  const [results, setResults] = useState({ created: 0, updated: 0, errors: 0, archived: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check global lock for replace mode
    if (mode !== 'replace') setConfirmGlobal(false)
  }, [mode])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleParse = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo Excel (.xlsx).')
      return
    }
    if (mode === 'replace' && !confirmGlobal) {
      setError('Você deve confirmar que a planilha contém o catálogo mestre completo.')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/catalog/import/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao processar planilha')

      setSessionId(data.session_id)
      setStats(data.stats)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (stats?.errors && stats.errors > 0) {
      setError('Existem erros críticos na planilha. Corrija-os e envie novamente.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/catalog/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          mode,
          price_table_id: priceTableId || null,
          publish_products: publish
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar sessão')

      setStep(4)
      processBatches(stats!.total_batches)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const processBatches = async (totalBatches: number) => {
    let created = 0
    let updated = 0
    let errors = 0
    let hasFailed = false

    for (let i = 1; i <= totalBatches; i++) {
      setCurrentBatch(i)
      try {
        const res = await fetch('/api/admin/catalog/import/process-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, batch_number: i })
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)

        created += data.created || 0
        updated += data.updated || 0
        errors += data.errors || 0
        
        setResults({ created, updated, errors, archived: 0 })
      } catch (err: any) {
        hasFailed = true
        setError(`Erro no lote ${i}: ${err.message}`)
        break
      }
    }

    if (!hasFailed && mode === 'replace') {
      try {
        const res = await fetch('/api/admin/catalog/import/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setResults(prev => ({ ...prev, archived: data.archived_count || 0 }))
      } catch (err: any) {
        setError(`Erro na finalização: ${err.message}`)
      }
    }

    setLoading(false)
    if (!hasFailed) setStep(5)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <AdminPageHeader
        title={mode === 'replace' ? 'Substituir Catálogo' : 'Importar Produtos'}
        description="Atualize seu catálogo usando uma planilha Excel."
      />

      {/* STEP INDICATOR */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border text-sm font-medium text-slate-500">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-navy-900' : ''}`}><span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">1</span> Configurar</div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-navy-900' : ''}`}><span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span> Prévia</div>
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-navy-900' : ''}`}><span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">3</span> Confirmar</div>
        <div className={`flex items-center gap-2 ${step >= 4 ? 'text-navy-900' : ''}`}><span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">4</span> Processar</div>
        <div className={`flex items-center gap-2 ${step >= 5 ? 'text-navy-900' : ''}`}><span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">5</span> Finalizado</div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-6">
        
        {step === 1 && (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modo de Importação</label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`border rounded-lg p-4 transition-colors border-navy-600 bg-navy-50`}
                  >
                    <h4 className="font-semibold text-slate-900">Importar e Atualizar</h4>
                    <p className="text-xs text-slate-500 mt-1">Cria novos produtos e atualiza os existentes. Não remove nada.</p>
                  </div>
                  <div 
                    className={`border rounded-lg p-4 bg-slate-50 opacity-50 cursor-not-allowed`}
                    title="Função disponível após a homologação inicial do catálogo."
                  >
                    <h4 className="font-semibold text-slate-600">Substituir Catálogo</h4>
                    <p className="text-xs text-slate-500 mt-1">Função disponível após a homologação inicial do catálogo.</p>
                  </div>
                </div>
              </div>

              {mode === 'replace' && (
                <div className="bg-amber-100 border border-amber-300 text-amber-800 p-4 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Atenção: Ação Global</h4>
                      <p className="text-sm mt-1 mb-2">Use esta opção somente quando a planilha possuir o catálogo completo da empresa. Produtos que não estiverem na planilha serão removidos da loja.</p>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={confirmGlobal} onChange={e => setConfirmGlobal(e.target.checked)} className="rounded border-amber-400 text-amber-600 focus:ring-amber-500" />
                        Confirmo que esta planilha contém o catálogo mestre completo.
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo Excel (.xlsx)</label>
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-10 w-10 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">{file ? file.name : 'Clique para selecionar a planilha'}</p>
                  <p className="text-xs text-slate-500 mt-1">Tamanho máximo recomendado: 10MB</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tabela de Preços (Opcional)</label>
                  <select 
                    value={priceTableId} 
                    onChange={e => setPriceTableId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input text-sm"
                  >
                    <option value="">Não atualizar preços</option>
                    {initialPriceTables.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Onde os preços de venda serão aplicados.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Publicação de Novos Produtos</label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="rounded border-slate-300" />
                      Publicar automaticamente novos produtos
                    </label>
                  </div>
                </div>
              </div>

              {error && <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded">{error}</div>}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleParse} disabled={loading || !file || (mode === 'replace' && !confirmGlobal)}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : 'Analisar Planilha'}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 2 && stats && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Prévia da Importação</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">Total Analisado</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 text-green-800 border-green-200">
                <p className="text-sm opacity-80">Perfeitamente Válidos</p>
                <p className="text-2xl font-semibold">{stats.valid}</p>
              </div>
              <div className="p-4 border rounded-lg bg-amber-50 text-amber-800 border-amber-200">
                <p className="text-sm opacity-80">Com Alertas</p>
                <p className="text-2xl font-semibold">{stats.warnings}</p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 text-red-800 border-red-200">
                <p className="text-sm opacity-80">Com Erros Críticos</p>
                <p className="text-2xl font-semibold">{stats.errors}</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 border border-blue-200">
              <strong>Nota:</strong> Produtos com "preço 0" gerarão alertas e terão seus preços comerciais inativados. Produtos identificados apenas como número podem ter perdido zeros à esquerda.
            </div>

            {error && <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded">{error}</div>}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Voltar</Button>
              {stats.errors > 0 ? (
                <Button disabled variant="danger">Corrija os erros para continuar</Button>
              ) : (
                <Button onClick={() => setStep(3)} disabled={loading}>Revisar e Continuar</Button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Confirmação Final</h3>
            
            <div className="bg-slate-50 p-6 rounded-lg border space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Modo:</span>
                <span className="font-semibold">{mode === 'replace' ? 'Substituir Catálogo' : 'Importar e Atualizar'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Tabela de Preços:</span>
                <span className="font-semibold">{initialPriceTables.find(t => t.id === priceTableId)?.name || 'Não atualizar'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Publicar Novos:</span>
                <span className="font-semibold">{publish ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Produtos Válidos na Planilha:</span>
                <span className="font-semibold text-green-700">{stats?.total} linhas ({stats?.total_batches} lotes)</span>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded">{error}</div>}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...</> : 'Confirmar e Iniciar Processamento'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && stats && (
          <div className="space-y-6 text-center py-8">
            <Loader2 className="h-12 w-12 text-navy-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-medium">Processando Importação</h3>
            <p className="text-slate-500">Lote {currentBatch} de {stats.total_batches}</p>
            
            <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-3 mt-4 overflow-hidden">
              <div 
                className="bg-navy-600 h-3 transition-all duration-300" 
                style={{ width: `${(currentBatch / stats.total_batches) * 100}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6 text-sm text-slate-600">
              <div className="text-right">Criados: <strong>{results.created}</strong></div>
              <div className="text-left">Atualizados: <strong>{results.updated}</strong></div>
            </div>

            {error && (
              <div className="text-sm text-red-600 font-medium bg-red-50 p-4 rounded mt-4 max-w-md mx-auto text-left">
                {error}
                <div className="mt-4 flex justify-center">
                   <Button variant="outline" onClick={() => router.push('/admin/produtos')} size="sm">Voltar para Produtos</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-medium text-slate-900">Importação Concluída</h3>
            <p className="text-slate-500 mb-6">Todos os lotes foram processados com sucesso.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="text-slate-500 mb-1">Criados</div>
                <div className="text-xl font-semibold">{results.created}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="text-slate-500 mb-1">Atualizados</div>
                <div className="text-xl font-semibold">{results.updated}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border text-red-800 border-red-200">
                <div className="opacity-80 mb-1">Falhas BD</div>
                <div className="text-xl font-semibold">{results.errors}</div>
              </div>
              {mode === 'replace' && (
                <div className="bg-amber-50 p-4 rounded-lg border text-amber-800 border-amber-200">
                  <div className="opacity-80 mb-1">Arquivados</div>
                  <div className="text-xl font-semibold">{results.archived}</div>
                </div>
              )}
            </div>

            <div className="pt-8">
              <Button onClick={() => router.push('/admin/produtos')}>Voltar para Produtos</Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
