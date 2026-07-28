import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct, PriceInfo } from '@/types/product.types'
import { getProductImageUrl } from '@/lib/utils/storage-url'

export interface HeroBannerItem {
  id: string
  title: string
  subtitle: string
  description: string
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  desktopImage: string
  mobileImage: string
  theme: 'dark' | 'light'
}

export interface BenefitItem {
  id: string
  title: string
  description: string
  iconName: 'Truck' | 'Building2' | 'Boxes' | 'Headset'
}

export interface CategoryCardData {
  id: string
  name: string
  slug: string
  itemCount: number
  imageUrl: string
  badgeText?: string
}

export interface BrandItem {
  id: string
  name: string
  slug: string
  initials: string
  category: string
}

export interface TestimonialItem {
  id: string
  name: string
  role: string
  company: string
  city: string
  state: string
  text: string
  rating: number
  isMockNotice?: boolean
}

export interface CollectionCampaign {
  id: string
  title: string
  slug: string
  description: string
  itemCount: number
  imageUrl: string
  ctaLabel: string
  badge?: string
  bgClass?: string
}

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
 * Camada de dados real para a Home Page (Supabase remoto).
 */
export async function getHomePageData(authContext: AuthContext): Promise<HomePageData> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')
  const supabase = await createClient()

  // 1. Categorias Ativas no Supabase
  const { data: dbCategoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  const dbCategories = (dbCategoriesData ?? []) as Array<{ id: string; name: string; slug: string }>

  const featuredCategories: CategoryCardData[] = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    itemCount: 0,
    imageUrl: '/placeholder-category.png',
  }))

  // 2. Marcas Ativas no Supabase
  const { data: dbBrandsData } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  const dbBrands = (dbBrandsData ?? []) as Array<{ id: string; name: string; slug: string }>

  const brands: BrandItem[] = dbBrands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    initials: b.name.slice(0, 2).toUpperCase(),
    category: 'Geral',
  }))

  // Helper para buscar produtos e transformar
  async function fetchProductsGroup(conditionColumn?: string, conditionValue?: boolean): Promise<CatalogProduct[]> {
    let query = supabase
      .from('products')
      .select(
        `
        id,
        sku,
        name,
        slug,
        unit,
        min_quantity,
        multiple_quantity,
        category_id,
        brand_id,
        categories!category_id (id, name, slug, is_active),
        brands!brand_id (id, name, slug, is_active),
        product_images (url, is_primary, position),
        product_variants (id, is_active)
        `,
      )
      .eq('is_active', true)
      .eq('is_published', true)
      .limit(6)

    if (conditionColumn && conditionValue !== undefined) {
      query = query.eq(conditionColumn, conditionValue)
    }

    const { data } = await query
    const rawProds = (data ?? []) as unknown as Array<{
      id: string
      sku: string
      name: string
      slug: string
      unit: string
      min_quantity: number
      multiple_quantity: number | null
      categories: { id: string; name: string; slug: string; is_active: boolean } | null
      brands: { id: string; name: string; slug: string; is_active: boolean } | null
      product_images: Array<{ url: string; is_primary: boolean; position: number }> | null
      product_variants: Array<{ id: string; is_active: boolean }> | null
    }>

    return Promise.all(
      rawProds.map(async (p) => {
        const images = (p.product_images ?? [])
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))
          .map((img) => getProductImageUrl(img.url))

        if (images.length === 0) images.push('/placeholder-product.png')

        const primaryVar = (p.product_variants ?? []).find((v) => v.is_active)
        let priceInfo: PriceInfo | undefined = undefined

        if (canViewPrices && primaryVar?.id) {
          const { data: pr } = (await (supabase.rpc as any)('get_effective_price_for_session', { p_variant_id: primaryVar.id })) as {
            data: Array<{ unit_price: number; promotional_price: number | null; effective_price: number; is_on_promotion: boolean }> | null
          }
          if (pr && pr.length > 0) {
            priceInfo = {
              unit_price: pr[0].unit_price,
              promotional_price: pr[0].promotional_price,
              effective_price: pr[0].effective_price,
              is_on_promotion: pr[0].is_on_promotion,
            }
          }
        }

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          images,
          unit: p.unit,
          min_quantity: p.min_quantity,
          multiple_quantity: p.multiple_quantity ?? 1,
          category: p.categories && p.categories.is_active ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug } : null,
          brand: p.brands && p.brands.is_active ? { id: p.brands.id, name: p.brands.name, slug: p.brands.slug } : null,
          price: priceInfo,
        }
      }),
    )
  }

  const [newArrivals, bestSellers, weeklyOpportunities] = await Promise.all([
    fetchProductsGroup('is_new_arrival', true),
    fetchProductsGroup('is_featured', true),
    fetchProductsGroup(),
  ])

  const { data: dbBannersData } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true })

  const dbBanners = dbBannersData ?? []

  const heroBanners: HeroBannerItem[] = dbBanners.length > 0 
    ? dbBanners.map(b => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || '',
        description: '',
        primaryCta: b.link_url ? { label: 'Saiba Mais', href: b.link_url } : { label: 'Explorar Catálogo', href: '/catalogo' },
        desktopImage: b.image_url,
        mobileImage: b.mobile_image_url || b.image_url,
        theme: 'dark',
      })) 
    : [
        {
          id: 'banner-1',
          title: 'Soluções Completas em Atacado B2B',
          subtitle: 'CONDIÇÕES ESPECIAIS B2B',
          description: 'Compre direto da distribuidora com preços exclusivos por tabela comercial e condições de pagamento flexíveis.',
          primaryCta: { label: 'Explorar Catálogo Real', href: '/catalogo' },
          desktopImage: '/placeholder-hero-1.png',
          mobileImage: '/placeholder-hero-1.png',
          theme: 'dark',
        },
      ]

  const benefits: BenefitItem[] = [
    { id: 'b-1', title: 'Faturamento B2B', description: 'Boleto bancário e crédito para empresas cadastradas', iconName: 'Boxes' },
    { id: 'b-2', title: 'Entrega para Todo o Brasil', description: 'Logística integrada e transportadoras parceiras', iconName: 'Truck' },
    { id: 'b-3', title: 'Atendimento Especializado', description: 'Vendedores dedicados para o seu segmento', iconName: 'Headset' },
  ]

  return {
    heroBanners,
    benefits,
    featuredCategories,
    newArrivals,
    bestSellers,
    weeklyOpportunities,
    collections: [],
    brands,
    testimonials: [],
    metrics: [
      { label: 'Produtos no Catálogo', value: '+5.000', hint: 'Variedade para o seu estoque' },
      { label: 'Categorias Comerciais', value: '+100', hint: 'Segmentos variados' },
      { label: 'Entrega Nacional', value: '100%', hint: 'Logística para todo o Brasil' },
      { label: 'Atendimento B2B', value: 'Dedicado', hint: 'Suporte na montagem do pedido' },
    ],
    canViewPrices,
    userStatus,
  }
}
