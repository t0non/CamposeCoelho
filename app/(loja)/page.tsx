import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import { getAuthContext } from '@/lib/supabase/auth'
import { getHomePageData } from '@/lib/data/home'
import { HeroCarousel } from '@/components/home/hero-carousel'
import { BenefitsBar } from '@/components/home/benefits-bar'
import { FeaturedCategories } from '@/components/home/featured-categories'
import { ProductShowcase } from '@/components/home/product-showcase'
import { PromotionalBanner } from '@/components/home/promotional-banner'
import { CampaignGrid } from '@/components/home/campaign-grid'
import { BrandCarousel } from '@/components/home/brand-carousel'
import { HowToBuy } from '@/components/home/how-to-buy'
import { BusinessRegistrationCTA } from '@/components/home/business-registration-cta'
import { TrustNumbers } from '@/components/home/trust-numbers'
import { Testimonials } from '@/components/home/testimonials'
import { InstitutionalSection } from '@/components/home/institutional-section'
import { NewsletterSection } from '@/components/home/newsletter-section'

export const metadata: Metadata = {
  title: 'Campos & Coelho Atacado | Produtos para revenda B2B',
  description:
    'Encontre produtos para revenda, utilidades domésticas, brinquedos, cadastre seu CNPJ e consulte condições comerciais exclusivas.',
  alternates: {
    canonical: 'http://localhost:3000',
  },
  openGraph: {
    title: 'Campos & Coelho Atacado | Plataforma de Atacado B2B',
    description:
      'Variedade para o seu negócio crescer. Cadastre seu CNPJ e acesse os preços de atacado.',
    url: 'http://localhost:3000',
    siteName: 'Campos & Coelho Atacado',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default async function HomePage() {
  // Resolve contexto de autenticação no servidor
  const authContext = await getAuthContext()

  // Consome camada de abstração de dados (prepara substituição por Supabase real no futuro)
  const homeData = await getHomePageData(authContext)

  // Structured Data (Schema.org) para SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'http://localhost:3000/#organization',
        name: 'Central Atacado',
        url: 'http://localhost:3000',
        logo: 'http://localhost:3000/logo.png',
        description: 'Plataforma de comércio eletrônico para atacado B2B.',
      },
      {
        '@type': 'WebSite',
        '@id': 'http://localhost:3000/#website',
        url: 'http://localhost:3000',
        name: 'Central Atacado',
        publisher: { '@id': 'http://localhost:3000/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'http://localhost:3000/catalogo?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col min-h-screen">
        {/* 1. Hero principal em carrossel */}
        <HeroCarousel banners={homeData.heroBanners} />

        {/* 2. Barra de benefícios */}
        <BenefitsBar benefits={homeData.benefits} />

        {/* 3. Categorias em destaque */}
        <FeaturedCategories categories={homeData.featuredCategories} />

        {/* 4. Vitrine de lançamentos */}
        <ProductShowcase
          title="Lançamentos"
          subtitle="Novidades para renovar o estoque e surpreender seus clientes."
          tagline="Novidades no Catálogo"
          products={homeData.newArrivals}
          canViewPrices={homeData.canViewPrices}
          userStatus={homeData.userStatus}
        />

        {/* 5. Banner promocional intermediário */}
        <PromotionalBanner />

        {/* 6. Vitrine de mais vendidos */}
        <ProductShowcase
          title="Mais Vendidos"
          subtitle="Produtos que já fazem parte do estoque de muitos lojistas."
          tagline="Alta Rotatividade"
          products={homeData.bestSellers}
          canViewPrices={homeData.canViewPrices}
          userStatus={homeData.userStatus}
        />

        {/* 7. Campanhas e coleções */}
        <CampaignGrid collections={homeData.collections} />

        {/* 8. Marcas parceiras */}
        <BrandCarousel brands={homeData.brands} />

        {/* 9. Como comprar */}
        <HowToBuy />

        {/* 10. Vitrine de oportunidades */}
        <ProductShowcase
          title="Oportunidades da Semana"
          subtitle="Produtos selecionados para melhorar a margem da sua loja."
          tagline="Preços Promocionais"
          products={homeData.weeklyOpportunities}
          canViewPrices={homeData.canViewPrices}
          userStatus={homeData.userStatus}
        />

        {/* 11. Chamada para cadastro empresarial */}
        <BusinessRegistrationCTA />

        {/* 12. Confiança e números */}
        <TrustNumbers metrics={homeData.metrics} />

        {/* 13. Depoimentos */}
        <Testimonials testimonials={homeData.testimonials} />

        {/* 14. Conteúdo institucional */}
        <InstitutionalSection />

        {/* 15. Newsletter */}
        <NewsletterSection />
      </div>
    </>
  )
}
