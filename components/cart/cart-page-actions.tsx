'use client'

import { useState, useTransition } from 'react'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { updateCartItemQuantityAction, removeCartItemAction } from '@/app/actions/cart'
import { Trash2, Loader2 } from 'lucide-react'

interface CartPageActionsProps {
  itemId: string
  quantity: number
  minQuantity: number
  multipleQuantity?: number | null
  unit?: string | null
  stockAvailable: number
}

export function CartPageActions({
  itemId,
  quantity,
  minQuantity,
  multipleQuantity,
  unit,
}: CartPageActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleQuantityChange = (newQty: number) => {
    if (isPending || newQty === quantity) return
    setError(null)

    startTransition(async () => {
      const res = await updateCartItemQuantityAction({
        item_id: itemId,
        quantity: newQty,
      })
      if (!res.success) {
        setError(res.message ?? 'Erro ao atualizar quantidade.')
      }
    })
  }

  const handleRemove = () => {
    if (isPending) return
    setError(null)

    startTransition(async () => {
      const res = await removeCartItemAction({ item_id: itemId })
      if (!res.success) {
        setError(res.message ?? 'Erro ao remover item.')
      }
    })
  }

  return (
    <div className="mt-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <QuantitySelector
          value={quantity}
          onChange={handleQuantityChange}
          min={minQuantity}
          step={multipleQuantity ?? 1}
          unit={unit ?? undefined}
          disabled={isPending}
        />

        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span>Remover</span>
        </button>
      </div>

      {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
    </div>
  )
}
