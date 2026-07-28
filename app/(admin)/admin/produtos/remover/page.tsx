'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function RemoverCatalogoPage() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleArchive = async () => {
    if (confirmText !== 'REMOVER TODOS OS PRODUTOS') return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/catalog/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation_text: confirmText }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao arquivar catálogo')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <AdminPageHeader
        title="Remover todos da loja"
        description="Zona de perigo. Oculte todo o catálogo da loja online de uma só vez."
      />

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">Catálogo arquivado com sucesso</h3>
          <p className="mb-6">Todos os produtos foram desativados e despublicados da loja.</p>
          <Button onClick={() => router.push('/admin/produtos')}>Voltar para Produtos</Button>
        </div>
      ) : (
        <div className="bg-white border border-red-200 rounded-lg p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-700">Atenção: Ação Irreversível</h2>
              <p className="text-sm text-slate-600 mt-1">
                Esta ação irá <strong>arquivar</strong> todos os produtos do catálogo. 
                Os dados não serão excluídos permanentemente para preservar o histórico de pedidos, 
                estoque e imagens, mas os produtos deixarão de aparecer na loja e seus preços comerciais 
                serão inativados.
              </p>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-md">
            <h3 className="font-medium text-red-800 mb-2">O que acontecerá:</h3>
            <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
              <li>Todos os produtos serão marcados como inativos e despublicados.</li>
              <li>Preços comerciais ativos serão desativados.</li>
              <li>Novas compras serão impossibilitadas.</li>
              <li>Estoque, reservas, imagens e pedidos históricos serão preservados intactos.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Para confirmar, digite exatamente a frase: <span className="font-mono bg-slate-100 px-1">REMOVER TODOS OS PRODUTOS</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input text-sm"
              placeholder="REMOVER TODOS OS PRODUTOS"
            />
          </div>

          {error && <div className="text-sm text-red-600 font-medium">{error}</div>}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => router.push('/admin/produtos')} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleArchive}
              disabled={confirmText !== 'REMOVER TODOS OS PRODUTOS' || loading}
            >
              {loading ? 'Arquivando...' : 'Remover Catálogo'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
