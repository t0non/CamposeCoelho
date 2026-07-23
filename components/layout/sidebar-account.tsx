'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User,
  Building2,
  FileCheck,
  Package,
  Heart,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/minha-conta', label: 'Minha Conta', icon: User, exact: true },
  { href: '/minha-conta/empresa', label: 'Dados da Empresa', icon: Building2 },
  { href: '/minha-conta/documentos', label: 'Documentos', icon: FileCheck },
  { href: '/minha-conta/pedidos', label: 'Meus Pedidos', icon: Package },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/minha-conta/enderecos', label: 'Endereços', icon: MapPin },
]

export function SidebarAccount() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0">
      <nav aria-label="Menu da conta">
        <ul className="space-y-1">
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
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
    </aside>
  )
}
