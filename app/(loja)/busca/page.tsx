import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
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
  title: 'Busca de Produtos no Atacado | Central Atacado',
  robots: {
    index: false,
    follow: true,
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const rawParams = await searchParams
  const authContext = await getAuthContext()

  const params = parseCatalogParams(rawParams, authContext.canViewPrices)
  const catalogData = await getCatalogProducts(params, authContext)
  const filterOptions = await getCatalogFilterOptions(params, authContext)

  const queryTerm = params.query || ''

  return (
    <div className="py-6 bg-slate-50 min-h-screen">
      <Container className="space-y-6">
        {/* Breadcrumb */}
        <CatalogBreadcrumb
          items={[
            { label: 'Catálogo', href: '/catalogo' },
            { label: queryTerm ? `Busca por "${queryTerm}"` : 'Busca de Produtos' },
          ]}
        />

        {/* Título da Busca */}
        <div className="space-y-1 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-extrabold text-slate-900">
            {queryTerm ? (
              <>
                Resultados para <span className="text-orange-600">"{queryTerm}"</span>
              </>
            ) : (
              'Busca de Produtos no Atacado'
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {catalogData.total > 0
              ? `Encontramos ${catalogData.total} produtos disponíveis no catálogo.`
              : 'Pesquise por nome, SKU, categoria ou marca.'}
          </p>
        </div>

        {/* Grade de Produtos & Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <CatalogFilterSidebar
                filterOptions={filterOptions}
                params={params}
                canViewPrices={catalogData.canViewPrices}
                baseUrl="/busca"
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <CatalogResultsHeader
              total={catalogData.total}
              params={params}
              canViewPrices={catalogData.canViewPrices}
            />

            <CatalogActiveChips params={params} baseUrl="/busca" />

            {catalogData.products.length === 0 ? (
              <div className="space-y-8 py-4">
                <EmptyState
                  title="Nenhum produto encontrado"
                  description={
                    queryTerm
                      ? `Não encontramos resultados para "${queryTerm}". Verifique a grafia ou tente termos mais genéricos.`
                      : 'Digite um termo de busca no campo superior para pesquisar no catálogo.'
                  }
                  actionLabel="Explorar Todo o Catálogo"
                  actionHref="/catalogo"
                />

                {/* Categorias Populares Recomendadas */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Categorias Populares Recomendadas:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/categoria/utilidades"
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Utilidades Domésticas
                    </Link>
                    <Link
                      href="/categoria/ferramentas"
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Ferramentas & Acessórios
                    </Link>
                    <Link
                      href="/categoria/brinquedos"
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Brinquedos & Jogos
                    </Link>
                    <Link
                      href="/categoria/papelaria"
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Papelaria
                    </Link>
                  </div>
                </div>
              </div>
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

            <Pagination
              currentPage={catalogData.page}
              totalPages={catalogData.totalPages}
              baseUrl="/busca"
              params={params}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
