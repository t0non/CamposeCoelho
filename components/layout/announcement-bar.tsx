import Link from 'next/link'
import { Phone, ShieldCheck, Truck, Store } from 'lucide-react'
import { mockCompany } from '@/lib/mocks/mock-company'
import { Container } from '@/components/ui/container'

export function AnnouncementBar() {
  const { contact } = mockCompany

  return (
    <div className="bg-navy-900 text-slate-200 text-xs py-2 border-b border-navy-800 select-none">
      <Container className="flex items-center justify-between gap-4">
        {/* Lado Esquerdo - Destaques Comerciais */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <Store className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
            <span className="font-semibold text-white">Venda exclusiva para empresas (CNPJ)</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
            <span>Pedido mínimo: R$ 1.000,00</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-slate-300">
            <Truck className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
            <span>Atendimento para todo o Brasil</span>
          </div>
        </div>

        {/* Lado Direito - Contato e Suporte */}
        <div className="flex items-center gap-4 shrink-0 font-medium">
          <a
            href={`tel:${contact.phone.replace(/\D/g, '')}`}
            className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
            <span>{contact.phone}</span>
          </a>

          <Link href="/cadastro" className="text-orange-400 hover:text-orange-300 font-bold underline">
            Cadastrar CNPJ
          </Link>
        </div>
      </Container>
    </div>
  )
}
