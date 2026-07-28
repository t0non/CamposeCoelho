'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import type { CatalogProduct } from '@/types/product.types'

interface ProductShowcaseProps {
  title: string
  subtitle?: string
  tagline?: string
  products: CatalogProduct[]
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
  seeAllHref?: string
}

export function ProductShowcase({
  title,
  products,
  canViewPrices,
  userStatus,
  seeAllHref = '/catalogo',
}: ProductShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollLeft + (dir === 'left' ? -amount : amount),
      behavior: 'smooth',
    })
  }

  if (!products || products.length === 0) return null

  return (
    <section className="py-6 bg-white border-b border-gray-200 select-none">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Section Header - Importec exact style */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#e8420a] rounded-full" />
            <h2 className="text-base font-extrabold text-[#1b3b6f] uppercase tracking-wide">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="w-8 h-8 rounded-full border border-gray-300 text-[#1b3b6f] hover:border-[#1b3b6f] hover:bg-[#1b3b6f] hover:text-white transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Próximo"
              className="w-8 h-8 rounded-full border border-gray-300 text-[#1b3b6f] hover:border-[#1b3b6f] hover:bg-[#1b3b6f] hover:text-white transition-colors flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            </button>
            <Link
              href={seeAllHref}
              className="text-xs font-bold text-[#0056b3] hover:text-[#e8420a] transition-colors ml-2"
            >
              Ver todos &rsaquo;
            </Link>
          </div>
        </div>

        {/* Product Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-3 no-scrollbar"
        >
          {products.map((product) => (
            <div key={product.id} className="w-[200px] sm:w-[220px] shrink-0">
              <ProductCard
                product={product}
                canViewPrices={canViewPrices}
                userStatus={userStatus}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
