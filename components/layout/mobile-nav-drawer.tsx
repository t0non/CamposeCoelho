'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  X,
  ChevronDown,
  User,
  ShoppingBag,
  Heart,
  Phone,
  MessageCircle,
  LogOut,
  Building2,
  Lock,
} from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { Logo } from '@/components/ui/logo'
import { mockDepartments } from '@/lib/mocks/mock-navigation'
import { mockCompany } from '@/lib/mocks/mock-company'
import { SearchInput } from '@/components/ui/search-input'
import type { AuthContext } from '@/types/auth.types'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
  authContext?: AuthContext
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  authContext,
}: MobileNavDrawerProps) {
  const [openDeptId, setOpenDeptId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const user = authContext?.user
  const company = authContext?.company

  const toggleDept = (id: string) => {
    setOpenDeptId(openDeptId === id ? null : id)
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="left">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center justify-between">
          <Logo />
        </div>

        {/* Busca Mobile */}
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar no atacado..."
        />

        {/* Conta do Usuário */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-white font-bold text-sm shrink-0">
                  {user.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              {company && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-orange-500" />
                  <span className="truncate">{company.company_name}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <Link
                  href="/minha-conta"
                  onClick={onClose}
                  className="rounded-lg bg-white border border-slate-200 p-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Minha Conta
                </Link>
                <Link
                  href="/minha-conta/pedidos"
                  onClick={onClose}
                  className="rounded-lg bg-white border border-slate-200 p-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Meus Pedidos
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <User className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Acesse sua Conta B2B</p>
                <p className="text-xs text-slate-500">
                  Cadastre sua empresa para visualizar preços e fazer pedidos.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-navy-900 py-2 text-xs font-bold text-white hover:bg-navy-800 text-center"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-orange-500 py-2 text-xs font-bold text-white hover:bg-orange-600 text-center"
                >
                  Cadastrar
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Accordion de Departamentos */}
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
            Departamentos
          </h3>

          {mockDepartments.map((dept) => {
            const isExpanded = openDeptId === dept.id
            const hasSub = Boolean(dept.subcategories && dept.subcategories.length > 0)

            return (
              <div key={dept.id} className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between bg-white px-3 py-2.5">
                  <Link
                    href={`/categoria/${dept.slug}`}
                    onClick={onClose}
                    className="text-xs font-bold text-slate-800 hover:text-orange-600"
                  >
                    {dept.name}
                  </Link>

                  {hasSub && (
                    <button
                      type="button"
                      onClick={() => toggleDept(dept.id)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      aria-label={`Expandir ${dept.name}`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-orange-500' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {hasSub && isExpanded && (
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 space-y-3">
                    {dept.subcategories?.map((sub) => (
                      <div key={sub.slug} className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-900 uppercase">
                          {sub.name}
                        </p>
                        {sub.items && (
                          <div className="pl-2 space-y-1 border-l-2 border-slate-200">
                            {sub.items.map((item) => (
                              <Link
                                key={item.slug}
                                href={`/categoria/${dept.slug}?item=${item.slug}`}
                                onClick={onClose}
                                className="text-xs text-slate-600 hover:text-orange-600 block py-0.5"
                              >
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Links Rápidos */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <Link
            href="/minha-conta/favoritos"
            onClick={onClose}
            className="flex items-center gap-3 text-xs font-semibold text-slate-700 hover:text-orange-600 py-1.5"
          >
            <Heart className="h-4 w-4 text-slate-400" />
            <span>Meus Favoritos</span>
          </Link>
          <a
            href={`https://wa.me/55${mockCompany.contact.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-xs font-semibold text-slate-700 hover:text-green-600 py-1.5"
          >
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span>Atendimento WhatsApp</span>
          </a>
        </div>
      </div>
    </Drawer>
  )
}
