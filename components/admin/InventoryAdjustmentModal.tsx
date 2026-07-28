'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { adjustInventoryAction } from '@/app/actions/inventory'
import { useRouter } from 'next/navigation'

interface InventoryAdjustmentModalProps {
  inventory: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryAdjustmentModal({ inventory, open, onOpenChange }: InventoryAdjustmentModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const [quantityDelta, setQuantityDelta] = useState<number>(0)
  const [movementType, setMovementType] = useState<string>('adjustment')
  const [reason, setReason] = useState<string>('')

  const currentAvailable = inventory.quantity_available
  const currentReserved = inventory.quantity_reserved
  const newAvailable = currentAvailable + quantityDelta
  const newUsable = newAvailable - currentReserved

  const isInvalid =
    quantityDelta === 0 ||
    !reason.trim() ||
    newAvailable < 0 ||
    newAvailable < currentReserved ||
    (movementType === 'return' && quantityDelta <= 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isInvalid) return

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const res = await adjustInventoryAction({
        inventory_id: inventory.id,
        quantity_delta: quantityDelta,
        movement_type: movementType,
        reason: reason.trim(),
      })

      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          router.refresh()
        }, 1500)
      } else {
        setError(res.message || 'Erro ao ajustar estoque.')
      }
    })
  }

  return (
    <Modal isOpen={open} onClose={() => !isPending && onOpenChange(false)} title="Ajustar Estoque Manual">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-slate-800">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Produto / Variante</label>
          <div className="p-3 bg-slate-50 border rounded-md text-sm">
            <span className="font-bold">{inventory.product?.name}</span>
            {inventory.variant && <span className="text-muted-foreground block text-xs">Variante: {inventory.variant.name}</span>}
            <span className="font-mono text-xs text-muted-foreground block">SKU: {inventory.variant?.sku || inventory.product?.sku}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estoque Físico Atual</label>
            <div className="p-2 border rounded bg-slate-50 text-sm font-mono">{currentAvailable}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estoque Reservado</label>
            <div className="p-2 border rounded bg-slate-50 text-sm font-mono">{currentReserved}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de Ajuste</label>
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value)
                setQuantityDelta(0)
              }}
              disabled={isPending}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="adjustment">Correção / Ajuste</option>
              <option value="return">Devolução Manual (+)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantidade (Delta)</label>
            <input
              type="number"
              step="1"
              value={quantityDelta || ''}
              onChange={(e) => setQuantityDelta(parseInt(e.target.value) || 0)}
              disabled={isPending}
              placeholder="Ex: 10 ou -5"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="p-3 border rounded bg-slate-50 text-xs space-y-1">
          <div className="flex justify-between">
            <span>Novo Estoque Físico Previsto:</span>
            <span className={`font-mono font-bold ${newAvailable < 0 ? 'text-red-600' : 'text-slate-800'}`}>{newAvailable}</span>
          </div>
          <div className="flex justify-between">
            <span>Novo Estoque Utilizável Previsto:</span>
            <span className={`font-mono font-bold ${newUsable < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{newUsable}</span>
          </div>
          {newAvailable < currentReserved && (
            <p className="text-red-600 font-medium pt-1">O estoque físico não pode ser inferior ao estoque reservado ({currentReserved}).</p>
          )}
          {newAvailable < 0 && (
            <p className="text-red-600 font-medium pt-1">O estoque físico final não pode ser negativo.</p>
          )}
          {movementType === 'return' && quantityDelta <= 0 && (
            <p className="text-amber-600 font-medium pt-1">Devoluções devem ser valores positivos.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Motivo do Ajuste *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            placeholder="Ex: Inventário cíclico, quebra de estoque, devolução do cliente..."
            maxLength={200}
            rows={2}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>

        {error && <div className="text-red-600 text-xs font-medium p-2 bg-red-50 border border-red-200 rounded">{error}</div>}
        {success && <div className="text-emerald-700 text-xs font-medium p-2 bg-emerald-50 border border-emerald-200 rounded">Estoque ajustado com sucesso!</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isPending || isInvalid}>
            {isPending ? 'Processando...' : 'Gravar Ajuste'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
