'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { getInventoryMovementsAction } from '@/app/actions/inventory'
import { formatDateTime } from '@/lib/utils/format'

interface InventoryHistoryModalProps {
  inventory: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryHistoryModal({ inventory, open, onOpenChange }: InventoryHistoryModalProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [count, setCount] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const limit = 5

  const loadMovements = () => {
    setError(null)
    startTransition(async () => {
      const res = await getInventoryMovementsAction(inventory.id, page, limit)
      if (res.success) {
        setMovements(res.data || [])
        setCount(res.count || 0)
      } else {
        setError(res.message || 'Erro ao carregar histórico.')
      }
    })
  }

  useEffect(() => {
    if (open) {
      loadMovements()
    }
  }, [open, page])

  const totalPages = Math.ceil(count / limit)

  const translateType = (type: string) => {
    switch (type) {
      case 'adjustment':
        return 'Ajuste Manual'
      case 'return':
        return 'Devolução'
      case 'sale':
        return 'Venda'
      case 'reservation':
        return 'Reserva'
      case 'release':
        return 'Liberação'
      default:
        return type
    }
  }

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title="Histórico de Movimentações (Imutável)">
      <div className="space-y-4 pt-4 text-slate-800">
        <div className="p-3 bg-slate-50 border rounded-md text-xs">
          <span className="font-bold block text-sm">{inventory.product?.name}</span>
          {inventory.variant && <span className="text-muted-foreground block">Variante: {inventory.variant.name}</span>}
          <span className="font-mono text-muted-foreground block">SKU: {inventory.variant?.sku || inventory.product?.sku}</span>
        </div>

        {error && <div className="text-red-600 text-xs font-medium p-2 bg-red-50 border border-red-200 rounded">{error}</div>}

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {isPending && movements.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Carregando movimentações...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Nenhuma movimentação registrada.</div>
          ) : (
            movements.map((m) => (
              <div key={m.id} className="p-3 border rounded-lg bg-white shadow-sm space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    {translateType(m.movement_type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDateTime(m.created_at)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center bg-slate-50 rounded font-mono">
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase">Anterior</span>
                    <span className="font-bold">{m.previous_quantity}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase">Delta</span>
                    <span className={`font-bold ${m.quantity_delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase">Resultante</span>
                    <span className="font-bold">{m.new_quantity}</span>
                  </div>
                </div>

                {m.reason && (
                  <p className="text-slate-600">
                    <span className="font-semibold">Motivo:</span> {m.reason}
                  </p>
                )}

                <div className="flex justify-between text-[10px] text-muted-foreground border-t pt-1.5">
                  <span>Por: {m.actor?.full_name || 'Sistema'}</span>
                  {m.reference_type && (
                    <span>Ref: {m.reference_type}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} ({count} total)
            </span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[10px]"
                disabled={page <= 1 || isPending}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[10px]"
                disabled={page >= totalPages || isPending}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
