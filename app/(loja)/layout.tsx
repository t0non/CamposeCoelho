import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { getAuthContext } from '@/lib/supabase/auth'

export const metadata: Metadata = {
  title: 'Central Atacado — Variedade para o seu negócio crescer',
  description:
    'Plataforma de atacado B2B para lojistas e revendedores. Cadastre seu CNPJ para liberar os preços de atacado.',
}

/**
 * Layout da loja pública.
 * Resolve o AuthContext no servidor e repassa para o Header.
 * Inclui WhatsAppButton e Footer.
 */
export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authContext = await getAuthContext()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header authContext={authContext} />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
