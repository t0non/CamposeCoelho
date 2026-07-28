'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Share2, ShieldCheck, Tag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ProductShareModal } from './product-share-modal'
import type { FullProductData } from '@/lib/data/products'

interface ProductSummaryProps {
  product: FullProductData
}

export function ProductSummary({ product }: ProductSummaryProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Marca & Categoria Links */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {product.brand && (
          <Link
            href={`/marca/${product.brand.slug}`}
            className="rounded-md bg-navy-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-500 transition-colors uppercase tracking-wider"
          >
            {product.brand.name}
          </Link>
        )}
        {product.category && (
          <Link
            href={`/categoria/${product.category.slug}`}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {product.category.name}
          </Link>
        )}
      </div>

      {/* Nome do Produto */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
        {product.name}
      </h1>

      {/* Metadados: SKU, EAN e Ações (Favoritos/Compartilhar) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-100 py-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <span>REF: <strong className="text-slate-800 font-bold">{product.sku}</strong></span>
          <span>EAN: <strong className="text-slate-800 font-bold">{product.detail.ean}</strong></span>
          <span className="inline-flex items-center gap-1 font-bold text-green-600">
            <ShieldCheck className="h-4 w-4" /> Em Estoque
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Favoritar */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold transition-colors',
              isFavorite ? 'border-red-200 bg-red-50 text-red-600' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-current text-red-600')} />
            <span>{isFavorite ? 'Favoritado' : 'Favoritar'}</span>
          </button>

          {/* Botão Compartilhar */}
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            aria-label="Compartilhar produto"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      <ProductShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        productName={product.name}
      />
    </div>
  )
}
