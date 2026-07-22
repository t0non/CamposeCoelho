import Link from 'next/link'
import { UserCheck, Search, ShieldCheck, ShoppingCart, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'

export function HowToBuy() {
  const steps = [
    {
      num: '01',
      title: 'Cadastre sua Empresa',
      text: 'Informe o CNPJ e os dados comerciais da sua empresa.',
      icon: UserCheck,
    },
    {
      num: '02',
      title: 'Aguarde a Análise Fiscal',
      text: 'Nossa equipe verifica as informações em até 24h úteis.',
      icon: ShieldCheck,
    },
    {
      num: '03',
      title: 'Acesse Preços Exclusivos',
      text: 'Após a aprovação, os preços de atacado e condições faturadas são liberados.',
      icon: Search,
    },
    {
      num: '04',
      title: 'Monte seu Pedido',
      text: 'Escolha os produtos por lotes e acompanhe a entrega na sua conta.',
      icon: ShoppingCart,
    },
  ]

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <Container className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
            Passo a Passo Simples
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Comprar no Atacado Ficou Mais Simples
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cadastre sua empresa e acesse condições comerciais exclusivas para o mercado B2B.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
              >
                <div className="absolute top-3 left-4 text-2xl font-black text-slate-100 select-none">
                  {step.num}
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-orange-400 shadow-md">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.text}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition-colors"
          >
            <span>Começar Meu Cadastro CNPJ</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  )
}
