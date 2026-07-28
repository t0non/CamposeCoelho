import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { getAuthContext } from '@/lib/supabase/auth'
import { getActiveCartSummary } from '@/lib/data/cart'
import type { CartSummary } from '@/lib/types/cart'

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

  // Carrinho para o header/minicart. Só busca para usuários autenticados;
  // a própria RPC devolve vazio para anon/pendente/rejeitado/admin.
  // Contexto de empresa do seller virá do BLOCO 12B — aqui o alvo é null.
  const emptyCart: CartSummary = { items: [], count: 0, subtotal: 0, hasUnavailable: false }
  const cartSummary = authContext.user ? await getActiveCartSummary(null) : emptyCart

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header authContext={authContext} cartSummary={cartSummary} />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
