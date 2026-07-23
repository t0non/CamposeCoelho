import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/container'
import { getAuthContext } from '@/lib/supabase/auth'
import { getBrandBySlug } from '@/lib/data/brands'
import { getCatalogProducts, getCatalogFilterOptions } from '@/lib/data/catalog'
import { parseCatalogParams } from '@/lib/utils/catalog-params'
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
  const brand = await getBrandBySlug(slug)

  if (!brand) {
    return { title: 'Marca Não Encontrada | Central Atacado' }
  }

  return {
    title: brand.metaTitle,
    description: brand.metaDescription,
    alternates: {
      canonical: `http://localhost:3000/marca/${slug}`,
    },
  }
}

export default async function BrandPage({ params: paramsPromise, searchParams }: PageProps) {
  const { slug } = await paramsPromise
  const brand = await getBrandBySlug(slug)

  if (!brand) {
    notFound()
  }

  const rawParams = await searchParams
  const authContext = await getAuthContext()

  // Força o filtro da marca na URL/Params
  const params = parseCatalogParams({ ...rawParams, marca: slug }, authContext.canViewPrices)
  const catalogData = await getCatalogProducts(params, authContext)
  const filterOptions = await getCatalogFilterOptions(params, authContext)

  return (
    <div className="py-6 bg-slate-50 min-h-screen">
      <Container className="space-y-6">
        {/* Breadcrumb */}
        <CatalogBreadcrumb
          items={[
            { label: 'Catálogo', href: '/catalogo' },
            { label: `Marca: ${brand.name}` },
          ]}
        />

        {/* Cabeçalho da Marca com Monograma */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-white font-black text-xl shrink-0 shadow-md">
            {brand.initials}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Fabricante Parceiro
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900">{brand.name}</h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {brand.description}
            </p>
          </div>
        </div>

        {/* Grade de Produtos & Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <CatalogFilterSidebar
                filterOptions={filterOptions}
                params={params}
                canViewPrices={catalogData.canViewPrices}
                baseUrl={`/marca/${slug}`}
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <CatalogResultsHeader
              total={catalogData.total}
              params={params}
              canViewPrices={catalogData.canViewPrices}
            />

            <CatalogActiveChips params={params} baseUrl={`/marca/${slug}`} />

            {catalogData.products.length === 0 ? (
              <EmptyState
                title="Nenhum produto desta marca"
                description="Não encontramos produtos correspondentes para esta marca no momento."
                actionLabel="Ver Todas as Marcas"
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

            <Pagination
              currentPage={catalogData.page}
              totalPages={catalogData.totalPages}
              baseUrl={`/marca/${slug}`}
              params={params}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
