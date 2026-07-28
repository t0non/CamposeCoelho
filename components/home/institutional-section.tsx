import Link from 'next/link'
import { Building2, CheckCircle2, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'

export function InstitutionalSection() {
  const differentials = [
    'Catálogo focado em produtos de alta rotatividade comercial',
    'Preços diretos da tabela de atacado para cadastros aprovados',
    'Atendimento ágil para cotações e dúvidas de faturamento',
    'Plataforma moderna, segura e fácil de navegar',
  ]

  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <Container>
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 bg-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-slate-200 min-h-[18rem]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-orange-400 mb-4 shadow-md">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Central Atacado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Variedade, agilidade e estrutura preparada para abastecer o seu negócio.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                Sobre a Empresa
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Uma Parceria para o Crescimento do Seu Negócio
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              A Central Atacado foi criada para facilitar o abastecimento de lojas, revendedores e empresas. Reunimos grande variedade de produtos, atendimento comercial especializado e uma experiência de compra moderna preparada para o mercado B2B.
            </p>

            <div className="space-y-2">
              {differentials.map((diff) => (
                <div key={diff} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span>{diff}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
              >
                <span>Conhecer Nossa Estrutura</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
