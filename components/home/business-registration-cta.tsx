import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/ui/container'

export function BusinessRegistrationCTA() {
  const benefits = [
    'Acesso liberado à tabela de preços atacadistas',
    'Condições faturadas via boleto (mediante aprovação)',
    'Acompanhamento completo do pedido no painel',
    'Suporte e consultoria dedicada no WhatsApp',
  ]

  return (
    <section className="py-16 bg-navy-900 text-white select-none relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-orange-500/10 skew-x-12 pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-3.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">
              <ShieldCheck className="h-4 w-4" />
              <span>Cadastro Comercial Gratuito</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Sua empresa compra melhor no atacado
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Cadastre seu CNPJ para consultar preços, disponibilidade e condições comerciais preparadas para impulsionar a margem do seu negócio.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
            <Link
              href="/cadastro"
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white shadow-xl hover:bg-orange-600 transition-colors text-center"
            >
              <span>Cadastrar Minha Empresa</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-navy-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-center"
            >
              <span>Já Tenho Cadastro → Fazer Login</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
