import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function PromotionalBanner() {
  return (
    <section className="py-4" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div
          className="relative overflow-hidden rounded-sm p-7 sm:p-10 text-white"
          style={{
            background: 'linear-gradient(135deg, #e8420a 0%, #c93808 50%, #0056b3 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-4 top-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
              Oportunidades de Revenda
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
              Mais variedade, mais oportunidades para a sua loja
            </h2>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Explore departamentos completos de utilidades, brinquedos, ferramentas e decoração para ampliar seu mix com alta margem comercial.
            </p>

            <div className="pt-1">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 bg-white text-[#e8420a] px-5 py-2.5 text-xs font-bold rounded-sm hover:bg-gray-100 transition-colors"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
