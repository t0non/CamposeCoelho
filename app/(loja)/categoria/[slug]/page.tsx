import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { getAuthContext } from '@/lib/supabase/auth'
import { getCategoryBySlug } from '@/lib/data/categories'
import { getCatalogProducts, getCatalogFilterOptions } from '@/lib/data/catalog'
import { parseCatalogParams, buildCatalogQueryString } from '@/lib/utils/catalog-params'
import { CatalogBreadcrumb } from '@/components/catalog/catalog-breadcrumb'
import { CatalogResultsHeader } from '@/components/catalog/catalog-results-header'
import { CatalogActiveChips } from '@/components/catalog/catalog-active-chips'
import { CatalogFilterSidebar } from '@/components/catalog/catalog-filter-sidebar'
import { ProductCard } from '@/components/product/product-card'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return { title: 'Categoria Não Encontrada | Central Atacado' }
  }

  return {
    title: category.metaTitle,
    description: category.metaDescription,
    alternates: {
      canonical: `http://localhost:3000/categoria/${slug}`,
    },
    openGraph: {
      title: category.metaTitle,
      description: category.metaDescription,
      url: `http://localhost:3000/categoria/${slug}`,
      siteName: 'Central Atacado',
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params: paramsPromise, searchParams }: PageProps) {
  const { slug } = await paramsPromise
  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const rawParams = await searchParams
  const authContext = await getAuthContext()

  // Força o filtro de categoria na URL/Params
  const params = parseCatalogParams({ ...rawParams, categoria: slug }, authContext.canViewPrices)
  const catalogData = await getCatalogProducts(params, authContext)
  const filterOptions = await getCatalogFilterOptions(params, authContext)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'http://localhost:3000' },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: 'http://localhost:3000/catalogo' },
      { '@type': 'ListItem', position: 3, name: category.name, item: `http://localhost:3000/categoria/${slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="py-6 bg-slate-50 min-h-screen">
        <Container className="space-y-6">
          {/* Breadcrumb */}
          <CatalogBreadcrumb
            items={[
              { label: 'Catálogo', href: '/catalogo' },
              { label: category.name },
            ]}
          />

          {/* Cabeçalho da Categoria */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="space-y-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                Departamento de Atacado
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900">{category.name}</h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                {category.longDescription}
              </p>
            </div>

            {/* Subcategorias em Chips */}
            {category.subcategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Subcategorias:</span>
                {category.subcategories.map((sub) => {
                  const isSelected = params.subcategory === sub.slug
                  const url = `/categoria/${slug}${buildCatalogQueryString(params, {
                    subcategory: isSelected ? undefined : sub.slug,
                    page: 1,
                  })}`

                  return (
                    <Link
                      key={sub.slug}
                      href={url}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sub.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Grade de Produtos & Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <CatalogFilterSidebar
                  filterOptions={filterOptions}
                  params={params}
                  canViewPrices={catalogData.canViewPrices}
                  baseUrl={`/categoria/${slug}`}
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <CatalogResultsHeader
                total={catalogData.total}
                params={params}
                canViewPrices={catalogData.canViewPrices}
              />

              <CatalogActiveChips params={params} baseUrl={`/categoria/${slug}`} />

              {catalogData.products.length === 0 ? (
                <EmptyState
                  title="Nenhum produto nesta categoria"
                  description="Não encontramos itens para os filtros aplicados nesta categoria."
                  actionLabel="Ver Todos os Produtos da Categoria"
                  actionHref={`/categoria/${slug}`}
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

              <Pagination
                currentPage={catalogData.page}
                totalPages={catalogData.totalPages}
                baseUrl={`/categoria/${slug}`}
                params={params}
              />
            </div>
          </div>
        </Container>
      </div>
    </>
  )
}
