'use client'

import { useState } from 'react'
import { ProductPricing } from './product-pricing'
import { ProductPurchasePanel } from './product-purchase-panel'
import type { FullProductData } from '@/lib/data/products'

interface ProductPurchasePanelWrapperProps {
  product: FullProductData
}

export function ProductPurchasePanelWrapper({ product }: ProductPurchasePanelWrapperProps) {
  const [quantity, setQuantity] = useState(product.min_quantity)

  return (
    <div className="space-y-4">
      <ProductPricing product={product} quantity={quantity} />
      <ProductPurchasePanel
        product={product}
        quantity={quantity}
        onQuantityChange={setQuantity}
      />
    </div>
  )
}
