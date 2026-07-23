'use client'

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { ProductCard } from './product-card'
import type { CatalogProduct } from '@/types/product.types'

interface RecentlyViewedProductsProps {
  currentProductSlug: string
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

export function RecentlyViewedProducts({
  currentProductSlug,
  canViewPrices,
  userStatus,
}: RecentlyViewedProductsProps) {
  const [recentProducts] = useState<CatalogProduct[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('b2b_recently_viewed_slugs')
      let slugs: string[] = stored ? JSON.parse(stored) : []

      slugs = [currentProductSlug, ...slugs.filter((s) => s !== currentProductSlug)].slice(0, 6)
      localStorage.setItem('b2b_recently_viewed_slugs', JSON.stringify(slugs))
    } catch {
      // Ignorar falhas de localStorage silenciosamente
    }
  }, [currentProductSlug])

  if (recentProducts.length === 0) return null

  return (
    <section className="space-y-4 pt-6 border-t border-slate-200">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-extrabold text-slate-900">Vistos Recentemente</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {recentProducts.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            canViewPrices={canViewPrices}
            userStatus={userStatus}
          />
        ))}
      </div>
    </section>
  )
}
