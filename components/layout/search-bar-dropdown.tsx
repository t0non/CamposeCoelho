'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SearchInput } from '@/components/ui/search-input'
import type { CatalogProduct } from '@/types/product.types'
import { ChevronRight, Package, Tag, ArrowUpRight } from 'lucide-react'

export function SearchBarDropdown() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    products: CatalogProduct[]
    categories: { name: string; slug: string }[]
    brands: string[]
  }>({ products: [], categories: [], brands: [] })

  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search over typed mock data
  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], categories: [], brands: [] })
      setIsOpen(false)
      return
    }

    setLoading(true)
    setIsOpen(true)

    const timer = setTimeout(() => {
      setResults({
        products: [],
        categories: [],
        brands: [],
      })
      setLoading(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        loading={loading}
        onFocus={() => {
          if (query.trim()) setIsOpen(true)
        }}
      />

      {/* Dropdown Result Box */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all max-h-[80vh] overflow-y-auto">
          {results.products.length === 0 && !loading ? (
            <div className="py-6 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Nenhum produto encontrado para &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tente buscar por marcas como &quot;Marca Premium&quot; ou &quot;Café&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Categorias Sugeridas */}
              {results.categories.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Categorias Encontradas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/categoria/${cat.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors"
                      >
                        <Tag className="h-3 w-3" />
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Produtos */}
              {results.products.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Produtos Sugeridos
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {results.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/produto/${product.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="relative h-12 w-12 rounded-lg bg-slate-100 p-1 shrink-0 overflow-hidden">
                          <Image
                            src={product.images[0] ?? '/placeholder-product.png'}
                            alt={product.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-orange-600">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>REF: {product.sku}</span>
                            <span>•</span>
                            <span>Mínimo: {product.min_quantity} {product.unit}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer "Ver todos" */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <Link
                  href={`/busca?q=${encodeURIComponent(query)}`}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                >
                  <span>Ver todos os resultados para &quot;{query}&quot;</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
