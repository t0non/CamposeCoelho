'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CatalogProduct } from '@/types/product.types'
import { ProductPrice } from './product-price'
import { PriceBlocked } from './price-blocked'

interface ProductCardProps {
  product: CatalogProduct
  canViewPrices: boolean
  userStatus?: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
  onAddToCart?: (product: CatalogProduct) => void
}

export function ProductCard({
  product,
  canViewPrices,
  userStatus = 'visitor',
  onAddToCart,
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [added, setAdded] = useState(false)

  const imageSrc = product.images?.[0] ?? '/placeholder-product.png'
  const secondImageSrc = product.images?.[1]

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Botão Favoritar */}
      <button
        type="button"
        onClick={() => setIsFavorite(!isFavorite)}
        aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm backdrop-blur-xs hover:bg-white hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <Heart
          className={cn('h-4 w-4 transition-colors', isFavorite && 'fill-red-500 text-red-500')}
        />
      </button>

      {/* Imagem do Produto com Hover para 2ª Imagem */}
      <Link href={`/produto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-50 p-4">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className={cn(
            'object-contain p-4 transition-all duration-300 group-hover:scale-105',
            secondImageSrc && 'group-hover:opacity-0',
          )}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        {secondImageSrc && (
          <Image
            src={secondImageSrc}
            alt={`${product.name} - Vista alternativa`}
            fill
            className="object-contain p-4 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        )}
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-4">
        {/* Marca / Categoria */}
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {product.brand?.name ?? product.category?.name ?? 'Atacado B2B'}
        </p>

        {/* Nome */}
        <Link href={`/produto/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Metadados: SKU e Mínimo */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
          <span>REF: <strong className="text-slate-700">{product.sku}</strong></span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
            Mín: {product.min_quantity} {product.unit}
          </span>
        </div>

        {/* Preço ou Preço Bloqueado */}
        <div className="mt-4 pt-2">
          {canViewPrices ? (
            <ProductPrice price={product.price} canViewPrices={true} />
          ) : (
            <PriceBlocked status={userStatus === 'approved' ? 'visitor' : userStatus} compact={true} />
          )}
        </div>

        {/* Botão Adicionar ao Carrinho (apenas para aprovados) */}
        {canViewPrices && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={added}
            className={cn(
              'mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
              added
                ? 'bg-green-600 text-white'
                : 'bg-navy-900 text-white hover:bg-orange-500 active:bg-orange-600',
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Adicionado ao Pedido
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Adicionar ao Pedido
              </>
            )}
          </button>
        )}
      </div>
    </article>
  )
}
