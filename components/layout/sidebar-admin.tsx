'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Tags,
  Bookmark,
  Users,
  ClipboardList,
  Image,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: Tags },
  { href: '/admin/marcas', label: 'Marcas', icon: Bookmark },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function SidebarAdmin() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-gray-100 bg-gray-50 min-h-screen">
      <div className="p-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Painel Admin
        </p>
        <nav aria-label="Menu administrativo">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3 w-3 text-blue-500" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
