import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import { Container } from '@/components/ui/container'
import { getAuthContext } from '@/lib/supabase/auth'
import { getCatalogProducts, getCatalogFilterOptions } from '@/lib/data/catalog'
import { parseCatalogParams } from '@/lib/utils/catalog-params'
import { CatalogBreadcrumb } from '@/components/catalog/catalog-breadcrumb'
import { CatalogResultsHeader } from '@/components/catalog/catalog-results-header'
import { CatalogActiveChips } from '@/components/catalog/catalog-active-chips'
import { CatalogFilterSidebar } from '@/components/catalog/catalog-filter-sidebar'
import { ProductCard } from '@/components/product/product-card'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = {
  title: 'Catálogo de Produtos para Revenda | Central Atacado B2B',
  description:
    'Explore produtos para revenda em utilidades, brinquedos, ferramentas e papelaria com condições de atacado para empresas.',
  alternates: {
    canonical: 'http://localhost:3000/catalogo',
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const rawParams = await searchParams
  const authContext = await getAuthContext()

  const params = parseCatalogParams(rawParams, authContext.canViewPrices)
  const catalogData = await getCatalogProducts(params, authContext)
  const filterOptions = await getCatalogFilterOptions(params, authContext)

  return (
    <div className="py-6 bg-slate-50 min-h-screen">
      <Container className="space-y-6">
        {/* Breadcrumb */}
        <CatalogBreadcrumb items={[{ label: 'Catálogo de Produtos' }]} />

        {/* Título & Descrição */}
        <div className="space-y-1 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Catálogo de Produtos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Explore produtos para revenda e encontre novas oportunidades para o seu negócio.
          </p>
        </div>

        {/* Grade do Catálogo & Barra Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Barra Lateral de Filtros Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <CatalogFilterSidebar
                filterOptions={filterOptions}
                params={params}
                canViewPrices={catalogData.canViewPrices}
                baseUrl="/catalogo"
              />
            </div>
          </div>

          {/* Área Principal dos Produtos */}
          <div className="lg:col-span-3 space-y-6">
            {/* Cabeçalho dos Resultados & Ordenação */}
            <CatalogResultsHeader
              total={catalogData.total}
              params={params}
              canViewPrices={catalogData.canViewPrices}
            />

            {/* Chips de Filtros Ativos */}
            <CatalogActiveChips params={params} baseUrl="/catalogo" />

            {/* Grade de Produtos ou Estado Vazio */}
            {catalogData.products.length === 0 ? (
              <EmptyState
                title="Nenhum produto encontrado"
                description="Não encontramos produtos correspondentes aos filtros selecionados. Tente ajustar os parâmetros ou limpar os filtros."
                actionLabel="Limpar Todos os Filtros"
                actionHref="/catalogo"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {catalogData.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canViewPrices={catalogData.canViewPrices}
                    userStatus={catalogData.userStatus}
                  />
                ))}
              </div>
            )}

            {/* Paginação */}
            <Pagination
              currentPage={catalogData.page}
              totalPages={catalogData.totalPages}
              baseUrl="/catalogo"
              params={params}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
