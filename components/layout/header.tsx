'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  User,
  ShoppingBag,
  Heart,
  Menu,
  ChevronDown,
  Building2,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/ui/logo'
import { AnnouncementBar } from './announcement-bar'
import { SearchBarDropdown } from './search-bar-dropdown'
import { MegaMenu } from './mega-menu'
import { MobileNavDrawer } from './mobile-nav-drawer'
import { CartSlideOver } from './cart-slide-over'
import { mockDepartments } from '@/lib/mocks/mock-navigation'
import type { AuthContext } from '@/types/auth.types'

interface HeaderProps {
  authContext?: AuthContext
}

export function Header({ authContext }: HeaderProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const user = authContext?.user
  const company = authContext?.company
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = company?.status ?? 'visitor'

  return (
    <>
      {/* Barra de Avisos Superior */}
      <AnnouncementBar />

      {/* Cabeçalho Fixo */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <Container className="flex h-20 items-center justify-between gap-4 lg:gap-8">
          {/* Botão Menu Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Abrir menu de navegação"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Logo Principal */}
          <Logo />

          {/* Busca Visual Desktop */}
          <div className="hidden lg:flex flex-1 max-w-xl">
            <SearchBarDropdown />
          </div>

          {/* Ações do Usuário: Conta, Favoritos, Carrinho */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Menu da Conta */}
            <div className="relative">
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 sm:px-3 sm:py-2 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-white font-bold text-xs shrink-0">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="hidden md:flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                      {user.full_name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 capitalize">
                      {company ? company.status : user.role}
                    </span>
                  </div>
                  <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 hover:border-orange-500 hover:text-orange-600 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <User className="h-4 w-4 text-orange-500" />
                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span>Entrar ou</span>
                    <span className="text-[10px] text-slate-500 font-normal">Cadastrar CNPJ</span>
                  </div>
                </Link>
              )}

              {/* Dropdown Menu da Conta */}
              {isUserMenuOpen && user && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 divide-y divide-slate-100">
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/minha-conta"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      <span>Minha Conta</span>
                    </Link>
                    <Link
                      href="/minha-conta/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <ShoppingBag className="h-4 w-4 text-slate-400" />
                      <span>Meus Pedidos</span>
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Painel Administrativo</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Favoritos */}
            <Link
              href="/minha-conta/favoritos"
              aria-label="Ver lista de favoritos"
              className="relative hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
            </Link>

            {/* Carrinho */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir carrinho de compras"
              className="flex items-center gap-2.5 rounded-xl bg-orange-500 px-3.5 py-2.5 text-white shadow-sm hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-navy-900 text-[10px] font-extrabold text-white">
                  2
                </span>
              </div>
              <div className="hidden lg:flex flex-col text-left leading-none">
                <span className="text-[10px] text-orange-100 uppercase tracking-wider font-semibold">
                  Meu Pedido
                </span>
                <span className="text-xs font-extrabold">
                  {canViewPrices ? 'R$ 1.942,55' : 'Preço protegido'}
                </span>
              </div>
            </button>
          </div>
        </Container>

        {/* Busca Mobile (Abaixo do logo em telas pequenas) */}
        <div className="px-4 pb-3 lg:hidden">
          <SearchBarDropdown />
        </div>

        {/* Menu de Departamentos & Navegação Secundária */}
        <div className="hidden lg:block border-t border-slate-100 bg-slate-50/80">
          <Container className="flex items-center justify-between">
            <div className="flex items-center gap-6 py-2">
              <MegaMenu />

              <nav className="flex items-center gap-1 font-medium text-xs text-slate-700">
                {mockDepartments.slice(0, 8).map((dept) => (
                  <Link
                    key={dept.id}
                    href={`/categoria/${dept.slug}`}
                    className="rounded-lg px-3 py-2 hover:bg-white hover:text-orange-600 transition-colors"
                  >
                    {dept.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-orange-600">
              <Link href="/catalogo?promo=1" className="hover:underline flex items-center gap-1">
                🔥 Ofertas da Semana
              </Link>
            </div>
          </Container>
        </div>
      </header>

      {/* Drawer Navegação Mobile */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        authContext={authContext}
      />

      {/* Slide-over Carrinho Lateral */}
      <CartSlideOver
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        canViewPrices={canViewPrices}
        userStatus={userStatus}
      />
    </>
  )
}
