'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, ChevronDown, ChevronRight, Sparkles, ArrowRight } from 'lucide-react'
import { mockDepartments, type DepartmentItem } from '@/lib/mocks/mock-navigation'
import { cn } from '@/lib/utils/cn'

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState<DepartmentItem>(mockDepartments[0])
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar com ESC ou clique fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mega-menu-panel"
        className={cn(
          'flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all cursor-pointer select-none',
          isOpen
            ? 'bg-orange-500 text-white shadow-md'
            : 'bg-navy-900 text-white hover:bg-navy-800',
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        <span>Todos os Departamentos</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {/* Painel do Mega Menu */}
      {isOpen && (
        <div
          id="mega-menu-panel"
          className="absolute left-0 top-full z-50 mt-2 w-[72rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all"
        >
          <div className="grid grid-cols-12 gap-6 min-h-[22rem]">
            {/* Coluna 1: Lista Principal de Departamentos */}
            <div className="col-span-4 border-r border-slate-100 pr-4 space-y-1">
              <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Categorias Principais
              </h3>
              {mockDepartments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onMouseEnter={() => setSelectedDept(dept)}
                  onClick={() => setSelectedDept(dept)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer',
                    selectedDept.id === dept.id
                      ? 'bg-orange-50 text-orange-600 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {dept.isFeatured && <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                    <span>{dept.name}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {dept.badge && (
                      <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-600">
                        {dept.badge}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>

            {/* Coluna 2: Subcategorias da Categoria Selecionada */}
            <div className="col-span-5 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDept.name}
                </h3>
                <Link
                  href={`/categoria/${selectedDept.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                >
                  <span>Ver todos os produtos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {selectedDept.subcategories && selectedDept.subcategories.length > 0 ? (
                <div className="grid grid-cols-2 gap-6">
                  {selectedDept.subcategories.map((sub) => (
                    <div key={sub.slug} className="space-y-2">
                      <Link
                        href={`/categoria/${selectedDept.slug}?sub=${sub.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-bold text-slate-900 hover:text-orange-600 block"
                      >
                        {sub.name}
                      </Link>
                      {sub.items && (
                        <ul className="space-y-1">
                          {sub.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                href={`/categoria/${selectedDept.slug}?item=${item.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-slate-500 hover:text-slate-900 transition-colors block"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Navegue pela categoria {selectedDept.name} para encontrar as melhores ofertas de atacado.
                </div>
              )}
            </div>

            {/* Coluna 3: Card Promocional ou Banner */}
            <div className="col-span-3 bg-slate-50 rounded-xl p-4 flex flex-col justify-between border border-slate-100">
              {selectedDept.promoBanner ? (
                <>
                  <div>
                    <span className="inline-block rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                      Destaque
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {selectedDept.promoBanner.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedDept.promoBanner.subtitle}
                    </p>
                  </div>
                  <Link
                    href={selectedDept.promoBanner.link}
                    onClick={() => setIsOpen(false)}
                    className="mt-4 block w-full rounded-xl bg-navy-900 py-2 text-center text-xs font-bold text-white hover:bg-orange-500 transition-colors"
                  >
                    Aproveitar Ofertas
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full space-y-3">
                  <Sparkles className="h-8 w-8 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Preços Exclusivos para Lojistas
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Faça login com seu CNPJ para liberar os preços da tabela de atacado.
                  </p>
                  <Link
                    href="/cadastro"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
                  >
                    Cadastrar CNPJ
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
