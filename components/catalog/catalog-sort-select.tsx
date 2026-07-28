'use client'

import { useRouter, usePathname } from 'next/navigation'
import { buildCatalogQueryString, type CatalogParams, type CatalogSort } from '@/lib/utils/catalog-params'

interface CatalogSortSelectProps {
  currentSort: CatalogSort
  canViewPrices: boolean
  params: CatalogParams
}

export function CatalogSortSelect({ currentSort, canViewPrices, params }: CatalogSortSelectProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as CatalogSort
    const qs = buildCatalogQueryString(params, { sort: newSort, page: 1 })
    router.push(`${pathname}${qs}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort-select" className="text-xs font-semibold text-slate-600 shrink-0">
        Ordenar por:
      </label>
      <select
        id="catalog-sort-select"
        value={currentSort}
        onChange={handleChange}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
      >
        <option value="relevancia">Relevância</option>
        <option value="mais-vendidos">Mais Vendidos</option>
        <option value="lancamentos">Lançamentos</option>
        <option value="nome-asc">Nome (A a Z)</option>
        <option value="nome-desc">Nome (Z a A)</option>

        {/* Opções de preço visíveis apenas para clientes aprovados */}
        {canViewPrices && (
          <>
            <option value="menor-preco">Menor Preço</option>
            <option value="maior-preco">Maior Preço</option>
          </>
        )}
      </select>
    </div>
  )
}
