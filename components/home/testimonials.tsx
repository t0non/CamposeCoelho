import { Star, Quote } from 'lucide-react'
import { Container } from '@/components/ui/container'
import type { TestimonialItem } from '@/lib/mocks/mock-testimonials'

interface TestimonialsProps {
  testimonials: TestimonialItem[]
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section className="py-12 bg-slate-50 border-b border-slate-200">
      <Container className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
            Prova Social
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Quem Compra, Recomenda
          </h2>
          <p className="text-xs text-slate-500">
            Depoimentos fictícios de demonstração de lojistas parceiros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 relative"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-slate-100" />

              <div className="space-y-3 relative z-10">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  {t.text}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-white font-bold text-xs shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {t.company} • {t.city}/{t.state}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
