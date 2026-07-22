'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { buildCatalogQueryString, type CatalogParams } from '@/lib/utils/catalog-params'

interface CatalogActiveChipsProps {
  params: CatalogParams
  baseUrl: string
}

export function CatalogActiveChips({ params, baseUrl }: CatalogActiveChipsProps) {
  const chips: { label: string; removeUrl: string }[] = []

  // Chip de Busca
  if (params.query) {
    chips.push({
      label: `Busca: "${params.query}"`,
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { query: undefined, page: 1 })}`,
    })
  }

  // Chip de Categoria
  if (params.category) {
    chips.push({
      label: `Categoria: ${params.category}`,
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { category: undefined, subcategory: undefined, page: 1 })}`,
    })
  }

  // Chip de Subcategoria
  if (params.subcategory) {
    chips.push({
      label: `Subcategoria: ${params.subcategory}`,
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { subcategory: undefined, page: 1 })}`,
    })
  }

  // Chips de Marcas
  if (params.brands && params.brands.length > 0) {
    params.brands.forEach((b) => {
      const remaining = params.brands!.filter((item) => item !== b)
      chips.push({
        label: `Marca: ${b}`,
        removeUrl: `${baseUrl}${buildCatalogQueryString(params, { brands: remaining, page: 1 })}`,
      })
    })
  }

  // Toggles
  if (params.isNew) {
    chips.push({
      label: 'Lançamentos',
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { isNew: false, page: 1 })}`,
    })
  }

  if (params.isPromotion) {
    chips.push({
      label: 'Oportunidades',
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { isPromotion: false, page: 1 })}`,
    })
  }

  // Faixa de Preço (Apenas se existir)
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    chips.push({
      label: `Preço: R$ ${params.minPrice ?? 0} - R$ ${params.maxPrice ?? 'máx'}`,
      removeUrl: `${baseUrl}${buildCatalogQueryString(params, { minPrice: undefined, maxPrice: undefined, page: 1 })}`,
    })
  }

  if (chips.length === 0) return null

  const clearAllUrl = baseUrl

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs font-semibold text-slate-500">Filtros ativos:</span>

      {chips.map((chip, i) => (
        <Link
          key={i}
          href={chip.removeUrl}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100 transition-colors"
        >
          <span>{chip.label}</span>
          <X className="h-3.5 w-3.5 text-orange-600" />
        </Link>
      ))}

      <Link
        href={clearAllUrl}
        className="text-xs font-bold text-slate-600 hover:text-red-600 underline ml-2"
      >
        Limpar todos
      </Link>
    </div>
  )
}
