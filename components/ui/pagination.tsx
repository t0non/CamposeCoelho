'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { buildCatalogQueryString, type CatalogParams } from '@/lib/utils/catalog-params'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  params: CatalogParams
}

export function Pagination({ currentPage, totalPages, baseUrl, params }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageUrl = (pageNumber: number) => {
    const qs = buildCatalogQueryString(params, { page: pageNumber })
    return `${baseUrl}${qs}`
  }

  // Gera número de páginas ao redor da atual
  const getPageNumbers = () => {
    const pages: number[] = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center justify-center gap-1.5 py-6">
      {/* Primeira Página */}
      <Link
        href={getPageUrl(1)}
        aria-label="Ir para a primeira página"
        aria-disabled={currentPage === 1}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold transition-colors ${
          currentPage === 1
            ? 'pointer-events-none text-slate-300 border-slate-100 bg-slate-50'
            : 'text-slate-700 hover:border-orange-500 hover:text-orange-600'
        }`}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Link>

      {/* Página Anterior */}
      <Link
        href={getPageUrl(Math.max(1, currentPage - 1))}
        aria-label="Ir para a página anterior"
        aria-disabled={currentPage === 1}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold transition-colors ${
          currentPage === 1
            ? 'pointer-events-none text-slate-300 border-slate-100 bg-slate-50'
            : 'text-slate-700 hover:border-orange-500 hover:text-orange-600'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {/* Números das Páginas */}
      {pageNumbers.map((p) => {
        const isCurrent = p === currentPage
        return (
          <Link
            key={p}
            href={getPageUrl(p)}
            aria-current={isCurrent ? 'page' : undefined}
            className={`flex h-9 min-w-9 px-3 items-center justify-center rounded-xl text-xs font-bold transition-all ${
              isCurrent
                ? 'bg-navy-900 text-white shadow-sm'
                : 'border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-600'
            }`}
          >
            {p}
          </Link>
        )
      })}

      {/* Próxima Página */}
      <Link
        href={getPageUrl(Math.min(totalPages, currentPage + 1))}
        aria-label="Ir para a próxima página"
        aria-disabled={currentPage === totalPages}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold transition-colors ${
          currentPage === totalPages
            ? 'pointer-events-none text-slate-300 border-slate-100 bg-slate-50'
            : 'text-slate-700 hover:border-orange-500 hover:text-orange-600'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>

      {/* Última Página */}
      <Link
        href={getPageUrl(totalPages)}
        aria-label="Ir para a última página"
        aria-disabled={currentPage === totalPages}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold transition-colors ${
          currentPage === totalPages
            ? 'pointer-events-none text-slate-300 border-slate-100 bg-slate-50'
            : 'text-slate-700 hover:border-orange-500 hover:text-orange-600'
        }`}
      >
        <ChevronsRight className="h-4 w-4" />
      </Link>
    </nav>
  )
}
