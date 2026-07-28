'use client'

import { Loader2, MousePointerClick } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'
import { PriceBlocked } from './price-blocked'
import { VolumeDiscountTable } from './volume-discount-table'
import type { FullProductData } from '@/lib/data/products'

interface ProductPricingProps {
  product: FullProductData
  quantity: number
  /**
   * true quando o produto tem 2+ variantes e nenhuma foi explicitamente
   * selecionada ainda (ou a navegação para a variante escolhida ainda não
   * concluiu) — o preço de `product` não corresponde a uma seleção
   * confirmada e não deve ser exibido como final.
   */
  awaitingSelection?: boolean
  isPending?: boolean
}

export function ProductPricing({ product, quantity, awaitingSelection = false, isPending = false }: ProductPricingProps) {
  // Caso o usuário não tenha permissão de preços
  if (!product.canViewPrices || !product.price) {
    return (
      <div className="py-2">
        <PriceBlocked status={product.userStatus} />
      </div>
    )
  }

  if (awaitingSelection) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 flex items-center gap-3">
        {isPending ? (
          <Loader2 className="h-5 w-5 text-slate-400 animate-spin shrink-0" />
        ) : (
          <MousePointerClick className="h-5 w-5 text-slate-400 shrink-0" />
        )}
        <p className="text-sm font-semibold text-slate-500">
          {isPending
            ? 'Atualizando preço da opção selecionada...'
            : 'Selecione uma opção acima para ver o preço e adicionar ao pedido.'}
        </p>
      </div>
    )
  }

  const { price, volumeDiscounts } = product
  const effectivePrice = price.effective_price

  // Identificar desconto por quantidade ativo
  const activeTier = volumeDiscounts?.find(
    (t) => quantity >= t.minQuantity && (t.maxQuantity === undefined || quantity <= t.maxQuantity),
  )

  const activeUnitPrice = activeTier
    ? (activeTier.pricePerUnit ?? activeTier.unitPrice ?? effectivePrice)
    : effectivePrice
  const totalSubtotal = (activeUnitPrice ?? 0) * quantity
  const unitsPerMaster = 1
  const totalUnitsCount = quantity * unitsPerMaster

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
      {/* Bloco de Preços em Destaque */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black text-slate-900">
            {formatPrice(activeUnitPrice ?? 0)}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            por {product.unit} ({unitsPerMaster} un/cx)
          </span>
        </div>

        {price.promotional_price && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 line-through">
              {formatPrice(price.unit_price)}
            </span>
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-extrabold text-green-700">
              Oferta Atacadista
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 pt-1">
          * Impostos inclusos na tabela B2B. Frete calculado na finalização do pedido.
        </p>
      </div>

      {/* Tabela de Descontos por Lote */}
      {volumeDiscounts && (
        <VolumeDiscountTable
          tiers={volumeDiscounts.map((t) => ({
            minQuantity: t.minQuantity,
            maxQuantity: t.maxQuantity,
            discountPercentage: t.discountPercent ?? t.discountPercentage ?? 0,
            pricePerUnit: t.unitPrice ?? t.pricePerUnit ?? 0,
          }))}
          currentQuantity={quantity}
          unit={product.unit}
        />
      )}

      {/* Resumo da Quantidade Selecionada & Subtotal */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-600">
            <strong>{quantity}</strong> {product.unit}s selecionadas (<strong>{totalUnitsCount}</strong> unidades)
          </p>
          <p className="text-[11px] text-slate-400">Embalagem Mínima: {product.min_quantity} {product.unit}</p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Subtotal:</span>
          <p className="text-lg font-black text-orange-600 leading-none">
            {formatPrice(totalSubtotal)}
          </p>
        </div>
      </div>
    </div>
  )
}
