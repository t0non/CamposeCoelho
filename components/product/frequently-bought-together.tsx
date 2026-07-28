'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Check, ShoppingBag } from 'lucide-react'
import { PriceBlocked } from './price-blocked'
import { formatPrice } from '@/lib/utils/format'
import type { CatalogProduct } from '@/types/product.types'
import type { FullProductData } from '@/lib/data/products'

interface FrequentlyBoughtTogetherProps {
  currentProduct: FullProductData
  items: CatalogProduct[]
}

export function FrequentlyBoughtTogether({ currentProduct, items }: FrequentlyBoughtTogetherProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    currentProduct.id,
    ...items.map((i) => i.id),
  ])
  const [added, setAdded] = useState(false)

  if (!items || items.length === 0) return null

  const toggleItem = (id: string) => {
    if (id === currentProduct.id) return // O produto atual fica fixo
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const allItems = [currentProduct, ...items]
  const selectedItems = allItems.filter((i) => selectedIds.includes(i.id))

  const calculatedTotal = selectedItems.reduce(
    (acc, i) => acc + (i.price?.effective_price ?? 0),
    0,
  )

  const handleAddSelected = () => {
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs select-none">
      <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
        Quem Compra Este Produto Também Leva
      </h2>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Lista de Imagens com Ícones + */}
        <div className="flex flex-wrap items-center justify-center gap-3 flex-1">
          {allItems.map((item, idx) => {
            const isSelected = selectedIds.includes(item.id)
            const isCurrent = item.id === currentProduct.id

            return (
              <div key={item.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  disabled={isCurrent}
                  className={`group relative h-24 w-24 rounded-xl border-2 p-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/20'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <Image
                    src={item.images?.[0] ?? '/placeholder-product.png'}
                    alt={item.name}
                    fill
                    className="object-contain p-2"
                  />
                  <div className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded bg-white border border-slate-300 text-[10px]">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-3 w-3 rounded text-orange-500"
                    />
                  </div>
                </button>

                {idx < allItems.length - 1 && (
                  <Plus className="h-5 w-5 text-slate-300 shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Resumo do Combo e Preço */}
        <div className="w-full lg:w-72 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 shrink-0">
          <p className="text-xs font-bold text-slate-700">
            {selectedItems.length} produtos selecionados no combo
          </p>

          {currentProduct.canViewPrices ? (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Total do Combo:</span>
              <p className="text-2xl font-black text-slate-900">
                {formatPrice(calculatedTotal)}
              </p>
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={added}
                className="w-full mt-2 h-10 rounded-xl bg-navy-900 text-xs font-bold text-white hover:bg-orange-500 transition-colors flex items-center justify-center gap-1.5"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Combo Adicionado
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Adicionar Selecionados
                  </>
                )}
              </button>
            </div>
          ) : (
            <PriceBlocked status={currentProduct.userStatus} compact={true} />
          )}
        </div>
      </div>
    </div>
  )
}
