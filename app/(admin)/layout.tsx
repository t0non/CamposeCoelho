import { redirect } from 'next/navigation'
import { SidebarAdmin } from '@/components/layout/sidebar-admin'
import { getAuthContext } from '@/lib/supabase/auth'

/**
 * Layout administrativo.
 * Verifica role=admin no servidor — redireciona qualquer outro usuário.
 * Aninhado dentro do RootLayout global.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getAuthContext()

  // Verificação dupla: proxy.ts + servidor
  if (!ctx.user) {
    redirect('/login')
  }

  if (ctx.user.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <SidebarAdmin />
      <div className="flex flex-1 flex-col">
        {/* Topbar admin */}
        <header className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Painel Administrativo
            </span>
            <span className="text-xs text-gray-500">
              {ctx.user.full_name ?? ctx.user.email}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
