import Link from 'next/link'
import {
  Gamepad2,
  Home,
  Sparkles,
  Tv,
  Baby,
  Dumbbell,
  Wrench,
  PartyPopper,
  ShoppingBag,
  Car,
  Utensils,
  LayoutGrid,
} from 'lucide-react'
import type { CategoryCardData } from '@/lib/mocks/mock-categories'

interface FeaturedCategoriesProps {
  categories: CategoryCardData[]
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  brinquedos: Gamepad2,
  'utilidade-domestica': Home,
  decoracao: Sparkles,
  'eletro-eletronicos': Tv,
  'bebes-cia': Baby,
  'esportes-lazer': Dumbbell,
  ferramentas: Wrench,
  festas: PartyPopper,
  acessorios: ShoppingBag,
  automoveis: Car,
  utilidades: Utensils,
}

export function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  if (!categories || categories.length === 0) return null

  return (
    <section className="py-6 bg-white border-b border-gray-200 select-none">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Section Header with Importec Orange Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-[#e8420a] rounded-full" />
            <h2 className="text-base font-extrabold text-[#1b3b6f] uppercase tracking-wide">
              NAVEGUE POR DEPARTAMENTOS
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="text-xs font-bold text-[#0056b3] hover:text-[#e8420a] transition-colors"
          >
            Ver todos &rsaquo;
          </Link>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {categories.slice(0, 16).map((cat) => {
            const IconComponent = CATEGORY_ICON_MAP[cat.slug ?? ''] ?? LayoutGrid

            return (
              <Link
                key={cat.id}
                href={`/catalogo?cat=${cat.slug ?? ''}`}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 bg-[#f9fafb] hover:bg-white hover:border-[#1b3b6f] hover:shadow-md transition-all group text-center min-h-[95px]"
              >
                <div className="w-10 h-10 rounded-full bg-[#1b3b6f]/10 text-[#1b3b6f] group-hover:bg-[#1b3b6f] group-hover:text-[#ffe000] flex items-center justify-center transition-colors mb-2">
                  <IconComponent className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 group-hover:text-[#1b3b6f] transition-colors leading-tight line-clamp-2">
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
