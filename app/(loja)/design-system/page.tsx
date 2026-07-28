'use client'

import { useState } from 'react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/components/ui/search-input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ErrorMessage } from '@/components/ui/error-message'
import { Modal } from '@/components/ui/modal'
import { Drawer } from '@/components/ui/drawer'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/spinner'
import { PriceBlocked } from '@/components/product/price-blocked'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { CategoryCard } from '@/components/ui/category-card'
import { ProductCard } from '@/components/product/product-card'
import { mockCategoriesList } from '@/lib/mocks/mock-categories'
import { mockProductsList } from '@/lib/mocks/mock-products'
import { Heart, ShoppingBag, ShieldCheck, Sparkles, Filter } from 'lucide-react'

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [quantity, setQuantity] = useState(5)

  return (
    <div className="py-10 space-y-12">
      <Container className="space-y-12">
        {/* Cabeçalho da Página */}
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Guia de Estilo & Componentes</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Design System — Central Atacado B2B
          </h1>
          <p className="text-sm text-slate-500">
            Página interna de demonstração dos tokens visuais, componentes de interface e estados interativos.
          </p>
        </div>

        {/* 1. Paleta de Cores & Tokens */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            1. Paleta de Cores & Tokens
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs font-medium">
            <div className="rounded-xl bg-navy-900 text-white p-4 space-y-1 shadow-sm">
              <p className="font-bold">Navy 900</p>
              <p className="opacity-80">#0F2942</p>
              <p className="text-[10px] opacity-60">Cor Primária</p>
            </div>
            <div className="rounded-xl bg-navy-800 text-white p-4 space-y-1 shadow-sm">
              <p className="font-bold">Navy 800</p>
              <p className="opacity-80">#163A5C</p>
              <p className="text-[10px] opacity-60">Hover Primário</p>
            </div>
            <div className="rounded-xl bg-orange-500 text-white p-4 space-y-1 shadow-sm">
              <p className="font-bold">Orange 500</p>
              <p className="opacity-80">#F97316</p>
              <p className="text-[10px] opacity-60">Destaque Comercial</p>
            </div>
            <div className="rounded-xl bg-green-600 text-white p-4 space-y-1 shadow-sm">
              <p className="font-bold">Green 600</p>
              <p className="opacity-80">#16A34A</p>
              <p className="text-[10px] opacity-60">Sucesso / Estoque</p>
            </div>
            <div className="rounded-xl bg-red-600 text-white p-4 space-y-1 shadow-sm">
              <p className="font-bold">Red 600</p>
              <p className="opacity-80">#DC2626</p>
              <p className="text-[10px] opacity-60">Erro / Alerta</p>
            </div>
            <div className="rounded-xl bg-slate-100 text-slate-900 border border-slate-200 p-4 space-y-1 shadow-sm">
              <p className="font-bold">Slate 100</p>
              <p className="text-slate-500">#F1F5F9</p>
              <p className="text-[10px] text-slate-400">Superfície Neutra</p>
            </div>
          </div>
        </section>

        {/* 2. Tipografia */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            2. Escala Tipográfica
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-mono">Título Principal (text-3xl font-extrabold)</p>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Variedade para o seu negócio crescer
              </h1>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono">Título de Seção (text-xl font-bold)</p>
              <h2 className="text-xl font-bold text-slate-900">
                Categorias em Destaque no Atacado
              </h2>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono">Corpo de Texto (text-sm text-slate-600)</p>
              <p className="text-sm text-slate-600">
                A Central Atacado oferece preços exclusivos para lojistas e revendedores cadastrados.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Botões */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            3. Botões & Ações Interativas
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary (Navy)</Button>
              <Button variant="accent">Accent (Orange)</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>

            <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">IconButtons:</span>
              <IconButton label="Adicionar aos favoritos" variant="outline">
                <Heart className="h-4 w-4" />
              </IconButton>
              <IconButton label="Meu Pedido" variant="secondary">
                <ShoppingBag className="h-4 w-4" />
              </IconButton>
              <IconButton label="Filtros" variant="primary">
                <Filter className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </section>

        {/* 4. Campos de Entrada (Form Controls) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            4. Campos de Entrada (Inputs)
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 grid md:grid-cols-2 gap-6">
            <Input label="CNPJ da Empresa" placeholder="00.000.000/0001-00" required />
            <Input label="Razão Social" placeholder="Nome empresarial" error="Razão social é obrigatória." />
            <SearchInput
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue('')}
            />
            <Select
              label="Segmento de Atuação"
              options={[
                { label: 'Supermercado / Mercearia', value: 'supermercado' },
                { label: 'Loja de Utilidades', value: 'utilidades' },
                { label: 'Papelaria', value: 'papelaria' },
              ]}
            />
            <div className="col-span-2">
              <Checkbox label="Li e aceito as condições comerciais e a política de privacidade" />
            </div>
          </div>
        </section>

        {/* 5. Componentes de Preço Bloqueado */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            5. Componente PriceBlocked (Estados de Proteção)
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">Estado: Visitante</p>
              <PriceBlocked status="visitor" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">Estado: Cliente Pendente</p>
              <PriceBlocked status="pending" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">Estado: Cliente Recusado</p>
              <PriceBlocked status="rejected" />
            </div>
          </div>
        </section>

        {/* 6. Seletor de Quantidade & Modais / Drawers */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            6. Controles Especiais & Overlays
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Seletor de Quantidade:</span>
              <QuantitySelector value={quantity} onChange={setQuantity} min={1} unit="CX" />
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                Testar Modal
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                Testar Drawer Lateral
              </Button>
            </div>
          </div>
        </section>

        {/* 7. ProductCard & CategoryCard */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            7. Cards de Produtos & Categorias
          </h2>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-700">CategoryCard:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mockCategoriesList.slice(0, 4).map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>

            <h3 className="text-sm font-bold text-slate-700 pt-4">ProductCard (Visitante vs Aprovado):</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <ProductCard product={mockProductsList[0]} canViewPrices={false} userStatus="visitor" />
              <ProductCard product={mockProductsList[1]} canViewPrices={false} userStatus="pending" />
              <ProductCard product={mockProductsList[2]} canViewPrices={true} userStatus="approved" />
              <ProductCard product={mockProductsList[3]} canViewPrices={true} userStatus="approved" />
            </div>
          </div>
        </section>

        {/* Modal Demo */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Janela de Demonstração">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Esta é uma janela modal responsiva com fechamento via botão, tecla Escape ou clique no fundo escuro.
            </p>
            <div className="rounded-lg bg-orange-50 p-3 text-xs font-semibold text-orange-800 border border-orange-200">
              🔒 A rolagem da página principal fica bloqueada enquanto a modal estiver aberta.
            </div>
          </div>
        </Modal>

        {/* Drawer Demo */}
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Painel Lateral Exemplo">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Este é um painel lateral deslizante (Drawer) para menus móveis ou mini carrinho.
            </p>
            <Button variant="accent" fullWidth onClick={() => setDrawerOpen(false)}>
              Entendi
            </Button>
          </div>
        </Drawer>
      </Container>
    </div>
  )
}
