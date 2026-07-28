'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  ShoppingCart,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Package,
  Keyboard,
  FileText,
} from 'lucide-react'
import { CartSlideOver } from './cart-slide-over'
import { MobileNavDrawer } from './mobile-nav-drawer'
import { formatPrice } from '@/lib/utils/format'
import type { AuthContext } from '@/types/auth.types'
import type { CartSummary } from '@/lib/types/cart'

interface HeaderProps {
  authContext?: AuthContext
  cartSummary?: CartSummary
}

const navCategories = [
  { label: 'Prendas Juninas', href: '/catalogo?cat=prendas-juninas' },
  { label: 'Lançamentos Disney', href: '/catalogo?cat=disney' },
  { label: 'Inverno', href: '/catalogo?cat=inverno' },
  { label: 'Dia dos Pais', href: '/catalogo?cat=dia-dos-pais' },
  { label: 'Brinquedos', href: '/catalogo?cat=brinquedos' },
  { label: 'Utilidades', href: '/catalogo?cat=utilidades' },
]

export function Header({ authContext, cartSummary }: HeaderProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const user = authContext?.user
  const company = authContext?.company
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = company?.status ?? 'visitor'

  const cartItems = cartSummary?.items ?? []
  const cartCount = cartSummary?.count ?? 0
  const cartSubtotal = cartSummary?.subtotal ?? 0

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <>
      {/* 1. TopBar - Deep Navy Blue with Gold/Yellow Text (Importec exact style) */}
      <div className="bg-[#1b3b6f] text-[#ffde00] text-xs font-semibold py-1.5 px-4 text-center tracking-wide">
        Venda para CNPJ com Inscrição Estadual - Pedido mínimo do site R$ 1000.00
      </div>

      {/* 2. Main Header Bar - White Background */}
      <header
        className={`sticky top-0 z-40 bg-white transition-shadow duration-200 ${
          isScrolled ? 'shadow-md' : 'border-b border-gray-100'
        }`}
      >
        {/* Row 1: Logo + Search + Actions */}
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="lg:hidden flex items-center justify-center w-9 h-9 text-[#1b3b6f]"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo - Importec Style (Bold Navy & Yellow Emblem) */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1">
            <div className="bg-[#1b3b6f] px-3 py-1.5 rounded flex items-center gap-1 shadow-sm">
              <span className="text-[#ffe000] font-black text-2xl tracking-tighter uppercase leading-none">
                CAMPOS
              </span>
              <span className="bg-[#ffe000] text-[#1b3b6f] font-black text-xs px-1 py-0.5 rounded uppercase leading-none">
                &amp; COELHO
              </span>
            </div>
          </Link>

          {/* Search Bar - Importec Style (Gray input + Yellow BUSCAR button) */}
          <form
            onSubmit={handleSearch}
            className="flex-1 hidden md:flex items-center max-w-xl mx-4"
          >
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="O que você procura?"
                className="w-full bg-[#f2f2f2] border-0 rounded-l-md px-4 py-2 text-xs text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#1b3b6f]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#ffe000] hover:bg-[#ebd000] text-[#1b3b6f] px-6 py-2 rounded-r-md font-black text-xs tracking-wider uppercase transition-colors shrink-0 flex items-center gap-1.5"
            >
              BUSCAR
            </button>
          </form>

          {/* Extra Icons & Account/Cart */}
          <div className="flex items-center gap-4 shrink-0 text-[#1b3b6f]">
            {/* Quick helper icons (Keyboard / Rapid order) */}
            <div className="hidden xl:flex items-center gap-2 text-gray-500 border-r border-gray-200 pr-3">
              <button title="Busca por Código" className="hover:text-[#1b3b6f]">
                <Keyboard className="h-5 w-5" />
              </button>
              <button title="Pedido Rápido" className="hover:text-[#1b3b6f]">
                <FileText className="h-5 w-5" />
              </button>
            </div>

            {/* Account Link */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 cursor-pointer hover:text-[#0056b3]"
                >
                  <User className="h-6 w-6 text-[#1b3b6f]" />
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-[#1b3b6f]">
                      {user.full_name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-gray-500">Minha Conta</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden sm:block" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 hover:text-[#0056b3]"
                >
                  <User className="h-6 w-6 text-[#1b3b6f]" />
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-[#1b3b6f]">Conta</span>
                    <span className="text-[10px] text-gray-500">Faça login ou cadastre-se</span>
                  </div>
                </Link>
              )}

              {/* User Dropdown */}
              {isUserMenuOpen && user && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded shadow-xl z-50 py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-900">{user.full_name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/minha-conta"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" /> Minha Conta
                  </Link>
                  <Link
                    href="/minha-conta/pedidos"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4" /> Meus Pedidos
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#0056b3] font-bold hover:bg-blue-50"
                    >
                      <ShieldCheck className="h-4 w-4" /> Painel Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-1">
                    <button
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Link */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 cursor-pointer hover:text-[#0056b3]"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-[#1b3b6f]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#ffe000] text-[#1b3b6f] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#1b3b6f]">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-[#1b3b6f]">Carrinho</span>
                <span className="text-[10px] text-gray-500 font-semibold">
                  {canViewPrices && cartCount > 0 ? formatPrice(cartSubtotal) : 'R$ 0,00'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden px-4 pb-2">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O que você procura?"
              className="flex-1 bg-[#f2f2f2] border-0 rounded-l-md px-3 py-2 text-xs text-gray-800 placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#ffe000] text-[#1b3b6f] px-4 py-2 rounded-r-md font-bold text-xs"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Row 2: Navigation Links (White Background - Importec exact style) */}
        <nav className="hidden lg:block border-t border-gray-100 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <ul className="flex items-center gap-1 text-xs font-semibold text-[#1b3b6f] py-1">
              {/* All Categories Dropdown */}
              <li>
                <Link
                  href="/catalogo"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[#1b3b6f] font-extrabold hover:text-[#0056b3] transition-colors"
                >
                  <Menu className="h-4 w-4 text-[#ffe000] stroke-[3]" />
                  Todas as Categorias
                </Link>
              </li>

              {/* Dynamic Nav Items */}
              {navCategories.map((cat) => (
                <li key={cat.label}>
                  <Link
                    href={cat.href}
                    className="px-3 py-1.5 hover:text-[#0056b3] transition-colors whitespace-nowrap"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}

              {/* OPORTUNIDADES Highlight Badge (Yellow pill - Importec exact style) */}
              <li className="ml-auto">
                <Link
                  href="/catalogo?promo=1"
                  className="bg-[#ffe000] hover:bg-[#ebd000] text-[#1b3b6f] font-black text-xs uppercase px-3 py-1 rounded tracking-wide transition-colors inline-block"
                >
                  OPORTUNIDADES
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        authContext={authContext}
      />

      {/* Cart Slide-Over */}
      <CartSlideOver
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        canViewPrices={canViewPrices}
        userStatus={userStatus}
        initialItems={cartItems}
      />
    </>
  )
}
