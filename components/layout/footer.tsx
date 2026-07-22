import Link from 'next/link'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  CreditCard,
  Barcode,
  QrCode,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/ui/logo'
import { mockCompany } from '@/lib/mocks/mock-company'

export function Footer() {
  const { name, slogan, cnpj, address, contact, socialLinks, footerLinks } = mockCompany

  return (
    <footer className="bg-navy-900 text-slate-300 pt-12 pb-6 border-t border-navy-800 select-none">
      <Container className="space-y-12">
        {/* Grid Principal do Rodapé */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Coluna 1: Empresa & Sobre */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="light" />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {slogan}. Plataforma de comércio atacadista B2B especializada em suprimentos para revendedores, mercados e empresas de todo o Brasil.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-navy-800">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {address.street}, {address.number} - {address.neighborhood}, {address.city}/{address.state} - CEP {address.zipCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-orange-400 shrink-0" aria-hidden="true" />
                <span>CNPJ: {cnpj}</span>
              </div>
            </div>

            {/* Redes Sociais */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Siga-nos no Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-slate-300 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Siga-nos no Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-slate-300 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Canal no YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-slate-300 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Página no LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-slate-300 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Atendimento & Contato */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Atendimento B2B
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-white truncate">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-400 pt-1">
                <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                <span>{contact.workingHours}</span>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Institucional */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Institucional
            </h3>
            <ul className="space-y-2 text-xs">
              {footerLinks.institucional.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-orange-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 4: Minha Conta */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Minha Conta
            </h3>
            <ul className="space-y-2 text-xs">
              {footerLinks.minhaConta.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-orange-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Área de Formas de Pagamento & Segurança */}
        <div className="border-t border-navy-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="space-y-2">
            <p className="font-semibold text-slate-300">Formas de Pagamento Comerciais:</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-navy-700">
                <QrCode className="h-4 w-4 text-green-400" /> PIX (À Vista)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-navy-700">
                <Barcode className="h-4 w-4 text-orange-400" /> Boleto Faturado
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-navy-700">
                <CreditCard className="h-4 w-4 text-blue-400" /> Cartão Empresarial
              </span>
            </div>
          </div>

          <div className="space-y-2 text-right md:text-right">
            <p className="font-semibold text-slate-300">Segurança & Privacidade:</p>
            <div className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-navy-700">
              <ShieldCheck className="h-4 w-4 text-green-400" /> Ambiente Seguro SSL 256-bit
            </div>
          </div>
        </div>

        {/* Rodapé Inferior */}
        <div className="border-t border-navy-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} {name}. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-400">Privacidade</a>
            <a href="#" className="hover:text-slate-400">Termos</a>
            <a href="#" className="hover:text-slate-400">Cookies</a>
          </div>
          <p className="text-orange-400 font-mono text-[10px]">
            * Demonstração B2B — Dados Fictícios de Exemplo
          </p>
        </div>
      </Container>
    </footer>
  )
}
