import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export function BusinessRegistrationCTA() {
  const benefits = [
    'Acesso à tabela de preços atacadistas',
    'Pedidos via boleto faturado (CNPJ aprovado)',
    'Acompanhamento completo dos pedidos',
    'Suporte dedicado para lojistas',
  ]

  return (
    <section
      className="py-12 text-white select-none relative overflow-hidden"
      style={{ backgroundColor: '#0056b3' }}
    >
      {/* Decorative diagonal */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none opacity-10"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, #e8420a 50%)',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-block bg-[#e8420a] text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
              Cadastro Empresarial Gratuito
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Compre no atacado com preços exclusivos para CNPJ
            </h2>

            <p className="text-sm text-blue-100 leading-relaxed max-w-2xl">
              Cadastre seu CNPJ com Inscrição Estadual para acessar preços, disponibilidade e condições comerciais exclusivas para lojistas e revendedores.
            </p>

            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-2 text-xs font-medium text-blue-100">
                  <CheckCircle2 className="h-4 w-4 text-[#e8420a] shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              href="/cadastro"
              className="flex items-center justify-center gap-2 h-12 w-full rounded-sm bg-[#e8420a] hover:bg-[#c93808] text-sm font-bold text-white transition-colors"
            >
              <span>Cadastrar Minha Empresa</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 h-11 w-full rounded-sm border-2 border-white/50 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Já tenho cadastro → Fazer Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
