import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { Container } from '@/components/ui/container'
import { getAuthContext } from '@/lib/supabase/auth'
import {
  getProductBySlug,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
} from '@/lib/data/products'

import { CatalogBreadcrumb } from '@/components/catalog/catalog-breadcrumb'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductSummary } from '@/components/product/product-summary'
import { ProductPricing } from '@/components/product/product-pricing'
import { ProductPurchasePanelWrapper } from '@/components/product/product-purchase-panel-wrapper'
import { ProductShippingEstimate } from '@/components/product/product-shipping-estimate'
import { ProductBenefits } from '@/components/product/product-benefits'
import { ProductDescription } from '@/components/product/product-description'
import { ProductSpecifications } from '@/components/product/product-specifications'
import { ProductPackaging } from '@/components/product/product-packaging'
import { FrequentlyBoughtTogether } from '@/components/product/frequently-bought-together'
import { ProductShowcase } from '@/components/home/product-showcase'
import { RecentlyViewedProducts } from '@/components/product/recently-viewed-products'
import { BusinessRegistrationCTA } from '@/components/home/business-registration-cta'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const authContext = await getAuthContext()
  const product = await getProductBySlug(slug, authContext)

  if (!product) {
    notFound()
  }

  return {
    title: `${product.name} no Atacado | Central Atacado B2B`,
    description: `Compre ${product.name} no atacado. REF: ${product.sku}. Embalagem mínima: ${product.min_quantity} ${product.unit}. Cadastre seu CNPJ.`,
    alternates: {
      canonical: `http://localhost:3000/produto/${slug}`,
    },
    openGraph: {
      title: `${product.name} no Atacado B2B`,
      description: `Compre ${product.name} no atacado direto da distribuidora.`,
      url: `http://localhost:3000/produto/${slug}`,
      siteName: 'Central Atacado',
      images: [
        {
          url: product.images[0] ?? 'http://localhost:3000/placeholder-product.png',
          alt: product.name,
        },
      ],
      type: 'website',
    },
  }
}

export default async function ProductPage({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps) {
  const { slug } = await paramsPromise
  const searchParams = await searchParamsPromise
  const rawVariantParam = searchParams.variant
  const variantParam = typeof rawVariantParam === 'string' ? rawVariantParam : undefined

  const authContext = await getAuthContext()

  const product = await getProductBySlug(slug, authContext, variantParam)

  if (!product) {
    notFound()
  }

  // Selecionado explicitamente = veio um ?variant= na URL E ele bateu com a
  // variante que o servidor efetivamente resolveu (garbage/variante alheia
  // cai de volta no default e não conta como seleção explícita).
  const variantExplicitlySelected = Boolean(variantParam) && product.currentVariantId === variantParam

  const relatedProducts = await getRelatedProducts(product, authContext)
  const frequentlyBoughtTogether = await getFrequentlyBoughtTogether(product, authContext)

  // Structured Data (JSON-LD) público (sem preços privados)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: 'http://localhost:3000' },
          {
            '@type': 'ListItem',
            position: 2,
            name: product.category?.name ?? 'Catálogo',
            item: `http://localhost:3000/categoria/${product.category?.slug ?? 'catalogo'}`,
          },
          { '@type': 'ListItem', position: 3, name: product.name, item: `http://localhost:3000/produto/${slug}` },
        ],
      },
      {
        '@type': 'Product',
        name: product.name,
        image: product.images,
        description: product.detail.longDescription,
        sku: product.sku,
        gtin13: product.detail.ean,
        brand: { '@type': 'Brand', name: product.brand?.name ?? 'Central Atacado' },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="py-6 bg-slate-50 min-h-screen">
        <Container className="space-y-10">
          {/* 1. Breadcrumb */}
          <CatalogBreadcrumb
            items={[
              { label: product.category?.name ?? 'Catálogo', href: `/categoria/${product.category?.slug ?? ''}` },
              { label: product.name },
            ]}
          />

          {/* Grid Principal do Produto: Galeria (Esquerda) vs Resumo Commercial & Preço (Direita) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Galeria de Imagens (5 colunas) */}
            <div className="lg:col-span-5 sticky top-24">
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            {/* Resumo & Bloco de Compra (7 colunas) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Resumo Comercial */}
              <ProductSummary product={product} />

              {/* Wrapper Cliente Interativo para Quantidade & Preço Atualizado */}
              <ProductPurchasePanelWrapper
                product={product}
                variantExplicitlySelected={variantExplicitlySelected}
              />

              {/* Simulador de Frete */}
              <ProductShippingEstimate />

              {/* Selos de Benefícios B2B */}
              <ProductBenefits />
            </div>
          </div>

          {/* Abas / Seções de Detalhes: Descrição, Especificações, Embalagem Master */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-10 shadow-xs">
            <ProductDescription product={product} />
            <ProductSpecifications product={product} />
            <ProductPackaging product={product} />
          </div>

          {/* Produtos Comprados Juntos */}
          {frequentlyBoughtTogether.length > 0 && (
            <FrequentlyBoughtTogether
              currentProduct={product}
              items={frequentlyBoughtTogether}
            />
          )}

          {/* Produtos Relacionados */}
          {relatedProducts.length > 0 && (
            <ProductShowcase
              title="Produtos Relacionados"
              subtitle="Itens do mesmo departamento recomendados para a sua loja."
              products={relatedProducts}
              canViewPrices={product.canViewPrices}
              userStatus={product.userStatus}
            />
          )}

          {/* Produtos Vistos Recentemente */}
          <RecentlyViewedProducts
            currentProductSlug={slug}
            canViewPrices={product.canViewPrices}
            userStatus={product.userStatus}
          />

          {/* Chamada para Cadastro Empresarial se não aprovado */}
          {!product.canViewPrices && <BusinessRegistrationCTA />}
        </Container>
      </div>
    </>
  )
}
