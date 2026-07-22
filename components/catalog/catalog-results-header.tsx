'use client'

import { SlidersHorizontal } from 'lucide-react'
import { CatalogSortSelect } from './catalog-sort-select'
import type { CatalogParams, CatalogSort } from '@/lib/utils/catalog-params'

interface CatalogResultsHeaderProps {
  total: number
  params: CatalogParams
  canViewPrices: boolean
  onOpenMobileFilters?: () => void
}

export function CatalogResultsHeader({
  total,
  params,
  canViewPrices,
  onOpenMobileFilters,
}: CatalogResultsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      {/* Total de Resultados */}
      <div className="flex items-center gap-3">
        {onOpenMobileFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 lg:hidden hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4 text-orange-500" />
            <span>Filtros</span>
          </button>
        )}

        <p className="text-xs font-semibold text-slate-700">
          <strong className="text-slate-900 font-extrabold">{total}</strong> produtos encontrados
        </p>
      </div>

      {/* Ordenação */}
      <CatalogSortSelect
        currentSort={params.sort ?? 'relevancia'}
        canViewPrices={canViewPrices}
        params={params}
      />
    </div>
  )
}
