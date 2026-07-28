import type { CatalogProduct } from '@/types/product.types'
import { ProductCard } from './product-card'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'

interface ProductGridProps {
  products: CatalogProduct[]
  canViewPrices: boolean
  loading?: boolean
  columns?: 2 | 3 | 4
}

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export function ProductGrid({
  products,
  canViewPrices,
  loading = false,
  columns = 4,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={`grid gap-4 ${columnClasses[columns]}`}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return <EmptyState preset="products" />
  }

  return (
    <div className={`grid gap-4 ${columnClasses[columns]}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          canViewPrices={canViewPrices}
        />
      ))}
    </div>
  )
}
