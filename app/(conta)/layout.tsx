import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SidebarAccount } from '@/components/layout/sidebar-account'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getAuthContext } from '@/lib/supabase/auth'

export const metadata: Metadata = {
  title: 'Minha Conta',
}

/**
 * Layout da área de conta do cliente.
 * Verifica autenticação no servidor — redireciona se não autenticado.
 * Aninhado dentro do RootLayout global.
 */
export default async function ContaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getAuthContext()

  // Proteção server-side (proxy.ts já redireciona, mas verificamos novamente)
  if (!ctx.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <SidebarAccount />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
