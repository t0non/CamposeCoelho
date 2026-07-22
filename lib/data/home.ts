import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct } from '@/types/product.types'
import { mockHeroBanners, type HeroBannerItem } from '@/lib/mocks/mock-banners'
import { mockBenefits, type BenefitItem } from '@/lib/mocks/mock-benefits'
import { mockCategoriesList, type CategoryCardData } from '@/lib/mocks/mock-categories'
import { mockProductsList, type PublicCatalogProduct } from '@/lib/mocks/mock-products'
import { mockCollections, type CollectionCampaign } from '@/lib/mocks/mock-collections'
import { mockBrands, type BrandItem } from '@/lib/mocks/mock-brands'
import { mockTestimonials, type TestimonialItem } from '@/lib/mocks/mock-testimonials'

export interface HomePageData {
  heroBanners: HeroBannerItem[]
  benefits: BenefitItem[]
  featuredCategories: CategoryCardData[]
  newArrivals: CatalogProduct[]
  bestSellers: CatalogProduct[]
  weeklyOpportunities: CatalogProduct[]
  collections: CollectionCampaign[]
  brands: BrandItem[]
  testimonials: TestimonialItem[]
  metrics: { label: string; value: string; hint: string }[]
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

/**
 * Função da camada de dados da página inicial (Data Abstraction Layer).
 */
export async function getHomePageData(authContext: AuthContext): Promise<HomePageData> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')

  const sanitizeProduct = (p: PublicCatalogProduct): CatalogProduct => {
    // Retorna o produto público sem preços para usuários não autorizados
    return p
  }

  const newArrivals = mockProductsList.filter((p) => p.isNew || p.id === 'prod-2').map(sanitizeProduct)
  const bestSellers = mockProductsList.filter((p) => p.isBestSeller || p.id === 'prod-1').map(sanitizeProduct)
  const weeklyOpportunities = mockProductsList.map(sanitizeProduct)

  return {
    heroBanners: mockHeroBanners,
    benefits: mockBenefits,
    featuredCategories: mockCategoriesList,
    newArrivals,
    bestSellers,
    weeklyOpportunities,
    collections: mockCollections,
    brands: mockBrands,
    testimonials: mockTestimonials,
    metrics: [
      { label: 'Produtos em Catálogo', value: '+5.000', hint: 'Variedade para o seu mix' },
      { label: 'Categorias de Atacado', value: '+100', hint: 'Diferentes nichos comerciais' },
      { label: 'Cobertura de Entrega', value: 'Nacional', hint: 'Frete e transporte B2B' },
      { label: 'Atendimento Especializado', value: '100%', hint: 'Suporte à montagem de pedido' },
    ],
    canViewPrices,
    userStatus,
  }
}
