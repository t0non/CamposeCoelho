import { SidebarAdmin } from '@/components/layout/sidebar-admin'
import { requireSellerOrAdmin } from '@/lib/supabase/auth'

/**
 * Layout do Painel do Vendedor.
 * Exige role seller ou admin no servidor — redireciona qualquer outro perfil.
 */
export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requireSellerOrAdmin()

  return (
    <div className="flex min-h-screen">
      <SidebarAdmin />
      <div className="flex flex-1 flex-col">
        {/* Topbar vendedor */}
        <header className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Painel do Vendedor
            </span>
            <span className="text-xs text-gray-500">
              {ctx.user?.full_name ?? ctx.user?.email} ({ctx.user?.role})
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
