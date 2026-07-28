'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Filter, Search, X } from 'lucide-react'
import { buildCatalogQueryString, type CatalogParams } from '@/lib/utils/catalog-params'
import type { CatalogFilterOptions } from '@/lib/data/catalog'

interface CatalogFilterSidebarProps {
  filterOptions: CatalogFilterOptions
  params: CatalogParams
  canViewPrices: boolean
  baseUrl: string
  onCloseMobile?: () => void
}

export function CatalogFilterSidebar({
  filterOptions,
  params,
  canViewPrices,
  baseUrl,
  onCloseMobile,
}: CatalogFilterSidebarProps) {
  const [brandSearch, setBrandSearch] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    toggles: true,
    price: true,
    units: false,
    minQty: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Marcas filtradas por busca interna
  const filteredBrands = filterOptions.brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  )

  const isBrandSelected = (slug: string) => {
    return params.brands?.includes(slug) ?? false
  }

  const getBrandToggleUrl = (slug: string) => {
    const current = params.brands ?? []
    const updated = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug]
    return `${baseUrl}${buildCatalogQueryString(params, { brands: updated, page: 1 })}`
  }

  return (
    <aside aria-label="Filtros do catálogo" className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="h-4 w-4 text-orange-500" />
          <span>Filtros do Catálogo</span>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-slate-700"
            aria-label="Fechar filtros"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 1. Categorias */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('categories')}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider"
        >
          <span>Categorias</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              openSections.categories ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.categories && (
          <div className="space-y-1.5 pt-2 text-xs">
            {filterOptions.categories.map((cat) => {
              const isSelected = params.category === cat.slug
              const url = `${baseUrl}${buildCatalogQueryString(params, {
                category: isSelected ? undefined : cat.slug,
                subcategory: undefined,
                page: 1,
              })}`

              return (
                <Link
                  key={cat.slug}
                  href={url}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                    isSelected
                      ? 'bg-navy-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({cat.count})
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. Destaques / Toggles */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('toggles')}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider"
        >
          <span>Destaques</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              openSections.toggles ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.toggles && (
          <div className="space-y-2 pt-2 text-xs">
            <Link
              href={`${baseUrl}${buildCatalogQueryString(params, {
                isNew: !params.isNew,
                page: 1,
              })}`}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
            >
              <input
                type="checkbox"
                checked={Boolean(params.isNew)}
                readOnly
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span>Somente Lançamentos</span>
            </Link>

            <Link
              href={`${baseUrl}${buildCatalogQueryString(params, {
                isPromotion: !params.isPromotion,
                page: 1,
              })}`}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
            >
              <input
                type="checkbox"
                checked={Boolean(params.isPromotion)}
                readOnly
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span>Somente Oportunidades</span>
            </Link>

            <Link
              href={`${baseUrl}${buildCatalogQueryString(params, {
                isBestSeller: !params.isBestSeller,
                page: 1,
              })}`}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
            >
              <input
                type="checkbox"
                checked={Boolean(params.isBestSeller)}
                readOnly
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span>Mais Vendidos</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Marcas Parceiras */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('brands')}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider"
        >
          <span>Marcas</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              openSections.brands ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.brands && (
          <div className="space-y-2 pt-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar marca..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 pl-8 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs no-scrollbar">
              {filteredBrands.map((brand) => {
                const selected = isBrandSelected(brand.slug)
                return (
                  <Link
                    key={brand.slug}
                    href={getBrandToggleUrl(brand.slug)}
                    className="flex items-center justify-between text-slate-700 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="truncate">{brand.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">({brand.count})</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Faixa de Preço (APENAS PARA USUÁRIOS AUTORIZADOS canViewPrices === true) */}
      {canViewPrices && (
        <div className="border-b border-slate-100 pb-4 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="flex w-full items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider"
          >
            <span>Faixa de Preço (R$)</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                openSections.price ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.price && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  defaultValue={params.minPrice ?? ''}
                  className="w-1/2 rounded-lg border border-slate-200 p-2 text-xs"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  defaultValue={params.maxPrice ?? ''}
                  className="w-1/2 rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
