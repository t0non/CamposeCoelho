import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { Container } from '@/components/ui/container'

export function PromotionalBanner() {
  return (
    <section className="py-8 bg-slate-50">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">
              <Layers className="h-4 w-4" />
              <span>Oportunidades de Revenda</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Mais variedade, mais oportunidades para a sua loja
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore departamentos completos de utilidades, papelaria, ferramentas e brinquedos para ampliar seu mix com altíssima margem comercial.
            </p>

            <div className="pt-2">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition-colors"
              >
                <span>Explorar Departamentos</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
