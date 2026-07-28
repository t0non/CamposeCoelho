'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Check } from 'lucide-react'
import type { CatalogProduct } from '@/types/product.types'
import { ProductPrice } from './product-price'

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
  const [added, setAdded] = useState(false)

  const imageSrc = product.images?.[0] ?? '/placeholder-product.png'

  const handleAdd = () => {
    if (onAddToCart) onAddToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <article className="group relative flex flex-col bg-white border border-gray-200 hover:border-[#1b3b6f] hover:shadow-lg transition-all duration-200 rounded overflow-hidden product-card h-full">
      {/* Product Image */}
      <Link
        href={`/produto/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-white p-2 border-b border-gray-100"
      >
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-contain p-2 product-card-image transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 220px"
        />
        {/* SKU Badge */}
        {product.sku && (
          <div className="absolute bottom-1.5 left-1.5 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
            REF: {product.sku}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        {/* Product Name */}
        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-xs font-bold text-gray-800 uppercase leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#0056b3] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price / Restricted Area */}
        <div className="mt-3 flex-1">
          {canViewPrices ? (
            <ProductPrice price={product.price} canViewPrices={true} />
          ) : (
            <div className="space-y-2 text-center bg-[#f8fafc] p-2 rounded border border-gray-100">
              <p className="text-[10px] text-gray-600 font-medium leading-tight">
                Para ver mais detalhes do produto faça login ou cadastre-se:
              </p>
              <div className="flex gap-1.5 pt-0.5">
                <Link
                  href="/login"
                  className="flex-1 text-center text-[10px] font-bold py-1 border border-[#1b3b6f] text-[#1b3b6f] hover:bg-[#1b3b6f] hover:text-white transition-colors rounded"
                >
                  Login
                </Link>
                <Link
                  href="/cadastro"
                  className="flex-1 text-center text-[10px] font-bold py-1 bg-[#1b3b6f] text-white hover:bg-[#142d54] transition-colors rounded"
                >
                  Cadastro
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Add to Cart (Approved Users) */}
        {canViewPrices && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={added}
            className={`mt-3 flex h-9 w-full items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wide transition-all rounded cursor-pointer ${
              added
                ? 'bg-green-600 text-white'
                : 'bg-[#ffe000] hover:bg-[#ebd000] text-[#1b3b6f]'
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Adicionado
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" /> Adicionar
              </>
            )}
          </button>
        )}
      </div>
    </article>
  )
}
