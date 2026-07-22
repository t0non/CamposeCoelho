'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react'
import { Container } from '@/components/ui/container'
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
  subtitle,
  tagline = 'Destaques Comerciais',
  products,
  canViewPrices,
  userStatus,
  seeAllHref = '/catalogo',
}: ProductShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    const scrollAmount = clientWidth * 0.8
    scrollRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <Container className="space-y-6">
        {/* Cabeçalho da Vitrine */}
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" />
              <span>{tagline}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {/* Botões de Navegação por Setas */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Rolar para esquerda"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Rolar para direita"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <Link
              href={seeAllHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Carrossel de Produtos */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 no-scrollbar"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[16rem] sm:w-[18rem] shrink-0"
            >
              <ProductCard
                product={product}
                canViewPrices={canViewPrices}
                userStatus={userStatus}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
