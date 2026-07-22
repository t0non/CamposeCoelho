import Link from 'next/link'
import { Award, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import type { BrandItem } from '@/lib/mocks/mock-brands'

interface BrandCarouselProps {
  brands: BrandItem[]
}

export function BrandCarousel({ brands }: BrandCarouselProps) {
  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <Container className="space-y-8">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <Award className="h-4 w-4" />
              <span>Marcas & Fabricantes</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Marcas que Fazem Parte do Nosso Catálogo
            </h2>
          </div>

          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
          >
            <span>Ver todas as marcas</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Monogramas / Caixas Tipográficas de Marcas Fictícias */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/marca/${b.slug}`}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-orange-500 hover:shadow-md transition-all text-center group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white font-extrabold text-sm mb-2 group-hover:bg-orange-500 transition-colors">
                {b.initials}
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-orange-600 truncate w-full">
                {b.name}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">{b.category}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
