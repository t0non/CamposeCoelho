'use client'

import { useState } from 'react'
import { ShoppingBag, Check, ArrowRight } from 'lucide-react'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { Button } from '@/components/ui/button'
import type { FullProductData } from '@/lib/data/products'

interface ProductPurchasePanelProps {
  product: FullProductData
  quantity: number
  onQuantityChange: (qty: number) => void
}

export function ProductPurchasePanel({
  product,
  quantity,
  onQuantityChange,
}: ProductPurchasePanelProps) {
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAddToCart = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setLoading(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  if (!product.canViewPrices) return null

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Seletor de Quantidade */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Qtd:</span>
          <QuantitySelector
            value={quantity}
            onChange={onQuantityChange}
            min={product.min_quantity}
            step={product.multiple_quantity ?? 1}
            unit={product.unit}
          />
        </div>

        {/* Botão Adicionar ao Pedido */}
        <Button
          type="button"
          variant={added ? 'primary' : 'accent'}
          loading={loading}
          disabled={added}
          onClick={handleAddToCart}
          className="flex-1 h-12 text-sm font-bold shadow-md cursor-pointer"
        >
          {added ? (
            <>
              <Check className="h-5 w-5 mr-1" />
              Adicionado ao Pedido!
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5 mr-1" />
              Adicionar ao Pedido
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
