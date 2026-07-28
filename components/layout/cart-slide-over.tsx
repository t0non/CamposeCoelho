'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Trash2, ArrowRight, Lock, AlertCircle, Loader2, X } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { PriceBlocked } from '@/components/product/price-blocked'
import { formatPrice } from '@/lib/utils/format'
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
  clearCartAction,
} from '@/app/actions/cart'
import type { CartLineItem } from '@/lib/types/cart'

interface CartSlideOverProps {
  isOpen: boolean
  onClose: () => void
  canViewPrices?: boolean
  userStatus?: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
  initialItems?: CartLineItem[]
  targetCompanyId?: string | null
}

export function CartSlideOver({
  isOpen,
  onClose,
  canViewPrices = false,
  userStatus = 'visitor',
  initialItems = [],
  targetCompanyId,
}: CartSlideOverProps) {
  const router = useRouter()
  const [items, setItems] = useState<CartLineItem[]>(initialItems)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [loadingItem, setLoadingItem] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)

  // Sincroniza com a fonte de verdade do servidor sempre que a leitura
  // set-based (get_active_cart_with_prices) for refeita via router.refresh().
  // Evita divergência entre o estado otimista local e o carrinho real.
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (loadingItem) return
    setLoadingItem(itemId)
    setErrors((prev) => ({ ...prev, [itemId]: '' }))

    startTransition(async () => {
      const result = await updateCartItemQuantityAction({ item_id: itemId, quantity: newQty })
      if (!result.success) {
        setErrors((prev) => ({ ...prev, [itemId]: result.message ?? 'Erro ao atualizar.' }))
      } else if (!result.noOp) {
        setItems((prev) =>
          prev.map((item) => (item.item_id === itemId ? { ...item, quantity: newQty } : item)),
        )
        // Reconcilia contador do header e preços estimados com o servidor.
        router.refresh()
      }
      setLoadingItem(null)
    })
  }

  const handleRemove = (itemId: string) => {
    if (loadingItem) return
    setLoadingItem(itemId)

    startTransition(async () => {
      const result = await removeCartItemAction({ item_id: itemId })
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.item_id !== itemId))
        if (!result.noOp) router.refresh()
      }
      setLoadingItem(null)
    })
  }

  const handleClear = () => {
    if (isClearing || isPending) return
    setIsClearing(true)

    startTransition(async () => {
      const result = await clearCartAction(
        targetCompanyId ? { target_company_id: targetCompanyId } : {},
      )
      if (result.success) {
        setItems([])
        if (!result.noOp) router.refresh()
      }
      setIsClearing(false)
    })
  }

  const estimatedSubtotal = items.reduce(
    (acc, item) => acc + (item.line_total ?? (item.effective_price ?? 0) * item.quantity),
    0,
  )
  const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0)
  const hasUnavailable = items.some((item) => !item.is_available)

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title={`Meu Carrinho${totalUnits > 0 ? ` (${totalUnits})` : ''}`}
      footer={
        <div className="space-y-3">
          {canViewPrices ? (
            <>
              {/* Aviso obrigatório */}
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Valores e disponibilidade serão confirmados ao finalizar o pedido.
              </p>

              {hasUnavailable && (
                <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Alguns itens estão indisponíveis. Remova-os antes de continuar.</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal Estimado:</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatPrice(estimatedSubtotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Impostos e frete calculados na finalização.
              </p>
              <Link
                href="/carrinho"
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white shadow-md hover:bg-orange-600 transition-colors"
              >
                <span>Ver Carrinho Completo</span>
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
            Navegue pelo catálogo e adicione produtos ao seu pedido.
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
        <div>
          {/* Limpar carrinho */}
          {items.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing || isPending}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {isClearing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                Limpar carrinho
              </button>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const isLoading = loadingItem === item.item_id
              const itemError = errors[item.item_id]

              return (
                <div key={item.item_id} className={`py-4 flex gap-3 ${!item.is_available ? 'opacity-60' : ''}`}>
                  {/* Imagem */}
                  <div className="relative h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {item.product_name}
                          {item.variant_name ? ` — ${item.variant_name}` : ''}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          REF: {item.variant_sku ?? item.product_sku}
                        </p>
                        {!item.is_available && item.unavailable_reason && (
                          <p className="text-[11px] text-red-500 mt-0.5 font-medium">
                            {item.unavailable_reason}
                          </p>
                        )}
                        {item.is_on_promotion && item.promotional_price != null && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            PROMOÇÃO
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.item_id)}
                        disabled={isPending || isLoading}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors disabled:opacity-40"
                        aria-label={`Remover ${item.product_name}`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(qty) => handleQuantityChange(item.item_id, qty)}
                        min={item.min_quantity}
                        step={item.multiple_quantity ?? 1}
                        unit={item.unit ?? undefined}
                        disabled={isPending || isLoading}
                      />

                      {canViewPrices ? (
                        <div className="text-right">
                          {item.effective_price != null ? (
                            <>
                              <span className="text-xs font-extrabold text-slate-900">
                                {formatPrice((item.line_total ?? item.effective_price * item.quantity))}
                              </span>
                              {item.unit_price != null && item.unit_price !== item.effective_price && (
                                <p className="text-[10px] text-slate-400 line-through">
                                  {formatPrice(item.unit_price * item.quantity)}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-red-500 font-medium">Sem preço</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Bloqueado
                        </span>
                      )}
                    </div>

                    {itemError && (
                      <p className="text-[11px] text-red-500 mt-1">{itemError}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Drawer>
  )
}
