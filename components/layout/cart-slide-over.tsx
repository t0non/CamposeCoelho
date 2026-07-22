'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Trash2, ArrowRight, Lock } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { PriceBlocked } from '@/components/product/price-blocked'
import { mockCartData, type MockCartLineItem } from '@/lib/mocks/mock-cart'
import { formatPrice } from '@/lib/utils/format'

interface CartSlideOverProps {
  isOpen: boolean
  onClose: () => void
  canViewPrices?: boolean
  userStatus?: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

export function CartSlideOver({
  isOpen,
  onClose,
  canViewPrices = false,
  userStatus = 'visitor',
}: CartSlideOverProps) {
  const [items, setItems] = useState<MockCartLineItem[]>(mockCartData.items)

  const handleQuantityChange = (id: string, newQty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)),
    )
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const calculatedSubtotal = items.reduce((acc, item) => {
    const unitVal = item.price?.effective_price ?? 0
    return acc + unitVal * item.quantity
  }, 0)

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title={`Meu Carrinho (${totalItemsCount})`}
      footer={
        <div className="space-y-4">
          {canViewPrices ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal Estimado:</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatPrice(calculatedSubtotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Impostos e frete calculados na finalização do pedido.
              </p>
              <Link
                href="/carrinho"
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white shadow-md hover:bg-orange-600 transition-colors"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className="space-y-3">
              <PriceBlocked status={userStatus} />
              <Link
                href="/cadastro"
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
              >
                <span>Cadastrar Minha Empresa</span>
              </Link>
            </div>
          )}
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Seu carrinho está vazio</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            Navegue pelo nosso catálogo de atacado e adicione produtos ao seu pedido.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800"
          >
            Explorar Produtos
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const lineSubtotal = (item.price?.effective_price ?? 0) * item.quantity

            return (
              <div key={item.id} className="py-4 flex gap-3">
                <div className="relative h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                      {item.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    REF: {item.sku}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(qty) => handleQuantityChange(item.id, qty)}
                      min={item.minQuantity}
                      unit={item.unit}
                    />

                    {canViewPrices ? (
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatPrice(lineSubtotal)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Drawer>
  )
}
