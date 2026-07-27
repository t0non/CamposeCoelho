'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPriceTableAction, updatePriceTableAction } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'

interface PriceTableFormProps {
  initialData?: any
}

export function PriceTableForm({ initialData }: PriceTableFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState<string>(initialData?.name || '')
  const [description, setDescription] = useState<string>(initialData?.description || '')

  // Formatar timestamptz para input datetime-local (yyyy-MM-ddThh:mm)
  const formatDatetimeLocal = (isoString?: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [startsAt, setStartsAt] = useState<string>(formatDatetimeLocal(initialData?.starts_at))
  const [endsAt, setEndsAt] = useState<string>(formatDatetimeLocal(initialData?.ends_at))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    }

    if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) {
      setError('A data de término deve ser posterior à data de início.')
      return
    }

    startTransition(async () => {
      let res
      if (initialData?.id) {
        res = await updatePriceTableAction(initialData.id, payload)
      } else {
        res = await createPriceTableAction(payload)
      }

      if (res.success) {
        router.push('/admin/tabelas-de-precos')
        router.refresh()
      } else {
        setError(res.message || 'Erro ao salvar tabela de preços.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md bg-white border p-6 rounded-md shadow-sm text-slate-800">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome da Tabela *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Ex: Tabela Varejo, Distribuidor Sul, etc."
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Descrição opcional..."
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Início da Vigência</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Fim da Vigência</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      {error && <div className="text-red-600 text-xs font-medium p-2 bg-red-50 border border-red-200 rounded">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => router.push('/admin/tabelas-de-precos')}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Gravando...' : 'Salvar Tabela'}
        </Button>
      </div>
    </form>
  )
}
