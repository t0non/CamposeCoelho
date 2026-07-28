'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ProductPricing } from './product-pricing'
import { ProductPurchasePanel } from './product-purchase-panel'
import { VariantSelector } from './variant-selector'
import type { FullProductData } from '@/lib/data/products'

interface ProductPurchasePanelWrapperProps {
  product: FullProductData
  /**
   * true quando a variante atualmente resolvida pelo servidor (product.currentVariantId)
   * veio de uma seleção explícita do usuário (URL ?variant=), e não do default
   * silencioso da primeira variante ativa.
   */
  variantExplicitlySelected: boolean
}

export function ProductPurchasePanelWrapper({
  product,
  variantExplicitlySelected,
}: ProductPurchasePanelWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [quantity, setQuantity] = useState(product.min_quantity)
  const [isNavPending, startNavTransition] = useTransition()

  const variantCount = product.variants.length

  // Estado de seleção derivado das regras do BLOCO 12A:
  // - 0 variantes: nada a selecionar, variant_id é sempre null.
  // - 1 variante: seleção automática (não há ambiguidade).
  // - 2+ variantes: exige seleção explícita — nunca variants[0] silencioso.
  const initialSelectedVariantId =
    variantCount === 0
      ? null
      : variantCount === 1
        ? product.variants[0].id
        : variantExplicitlySelected
          ? product.currentVariantId
          : null

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(initialSelectedVariantId)

  // O preço em `product` só é autoritativo para a variante que o SERVIDOR
  // resolveu (product.currentVariantId). Enquanto a navegação para a nova
  // variante está pendente, ou nada foi selecionado, o preço do navegador
  // não é exibido como final — nunca confiamos em preço client-side.
  const priceIsAuthoritative = variantCount === 0 || selectedVariantId === product.currentVariantId
  const awaitingSelection = variantCount >= 2 && (!selectedVariantId || !priceIsAuthoritative)

  const currentVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null

  function handleSelectVariant(variantId: string) {
    setSelectedVariantId(variantId)
    // Re-executa a página no servidor com a variante escolhida: preço e
    // estoque exibidos passam a vir de getProductBySlug(selectedVariantId),
    // nunca calculados no navegador.
    startNavTransition(() => {
      router.push(`${pathname}?variant=${variantId}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-4">
      {variantCount > 0 && (
        <VariantSelector
          variants={product.variants}
          selectedVariantId={selectedVariantId}
          onSelect={handleSelectVariant}
          interactive={variantCount >= 2}
          isPending={isNavPending}
        />
      )}

      <ProductPricing
        product={product}
        quantity={quantity}
        awaitingSelection={awaitingSelection}
        isPending={isNavPending}
      />

      <ProductPurchasePanel
        product={product}
        quantity={quantity}
        onQuantityChange={setQuantity}
        selectedVariantId={selectedVariantId}
        requiresVariantSelection={variantCount >= 2}
        priceIsAuthoritative={priceIsAuthoritative}
        isNavPending={isNavPending}
        currentVariantSku={currentVariant?.sku ?? (variantCount === 0 ? product.sku : undefined)}
      />
    </div>
  )
}
