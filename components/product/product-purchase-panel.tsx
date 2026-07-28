'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Check, AlertCircle } from 'lucide-react'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { Button } from '@/components/ui/button'
import { addToCartAction } from '@/app/actions/cart'
import type { FullProductData } from '@/lib/data/products'

interface ProductPurchasePanelProps {
  product: FullProductData
  quantity: number
  onQuantityChange: (qty: number) => void
  /** Variante escolhida pelo usuário (ou única/auto quando não há ambiguidade); null se ainda não escolhida. */
  selectedVariantId: string | null
  /** true quando o produto tem 2+ variantes ativas — exige seleção explícita antes de habilitar o botão. */
  requiresVariantSelection: boolean
  /** false enquanto a navegação para a variante escolhida ainda não trouxe o preço/estoque do servidor. */
  priceIsAuthoritative: boolean
  isNavPending: boolean
  currentVariantSku?: string
}

export function ProductPurchasePanel({
  product,
  quantity,
  onQuantityChange,
  selectedVariantId,
  requiresVariantSelection,
  priceIsAuthoritative,
  isNavPending,
  currentVariantSku,
}: ProductPurchasePanelProps) {
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Trocar de variante limpa qualquer mensagem antiga de sucesso/erro.
  useEffect(() => {
    setAdded(false)
    setError(null)
  }, [selectedVariantId])

  // Produto sem nenhuma variante ativa → variant_id null é o valor correto.
  // Produto com 2+ variantes exige seleção explícita antes de liberar o botão.
  const canSubmit =
    !isPending &&
    !isNavPending &&
    !added &&
    priceIsAuthoritative &&
    (!requiresVariantSelection || Boolean(selectedVariantId))

  const handleAddToCart = () => {
    if (!canSubmit) return
    setError(null)

    startTransition(async () => {
      const result = await addToCartAction({
        product_id: product.id,
        variant_id: selectedVariantId,
        quantity,
        // Customer NÃO envia target_company_id (a RPC deriva a empresa do
        // próprio profile). Preço, profile_id, estoque e company_id jamais
        // são enviados pelo cliente.
      })

      if (!result.success) {
        setError(result.message ?? 'Não foi possível adicionar ao carrinho.')
        return
      }

      setAdded(true)
      // Atualiza contador do header e o minicart (leitura set-based no layout).
      router.refresh()
      setTimeout(() => setAdded(false), 2500)
    })
  }

  if (!product.canViewPrices) return null

  return (
    <div className="space-y-3 pt-2">
      {currentVariantSku && (
        <p className="text-[11px] text-slate-500">
          Será adicionado: <strong className="text-slate-800">REF {currentVariantSku}</strong>
        </p>
      )}

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
            disabled={isPending}
          />
        </div>

        {/* Botão Adicionar ao Pedido */}
        <Button
          type="button"
          variant={added ? 'primary' : 'accent'}
          loading={isPending}
          disabled={!canSubmit}
          onClick={handleAddToCart}
          className="flex-1 h-12 text-sm font-bold shadow-md cursor-pointer"
        >
          {added ? (
            <>
              <Check className="h-5 w-5 mr-1" />
              Adicionado ao Pedido!
            </>
          ) : requiresVariantSelection && !selectedVariantId ? (
            'Selecione uma opção'
          ) : (
            <>
              <ShoppingBag className="h-5 w-5 mr-1" />
              Adicionar ao Pedido
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
