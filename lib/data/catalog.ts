import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct, PriceInfo } from '@/types/product.types'
import type { CatalogParams } from '@/lib/utils/catalog-params'
import { getProductImageUrl } from '@/lib/utils/storage-url'
import { getCatalogPricingForCurrentCustomer } from '@/lib/data/pricing'

export interface CatalogResult {
  products: CatalogProduct[]
  total: number
  page: number
  perPage: number
  totalPages: number
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

export interface CatalogFilterOptions {
  categories: { name: string; slug: string; count: number }[]
  subcategories: { name: string; slug: string; count: number }[]
  brands: { name: string; slug: string; count: number }[]
  units: string[]
  availableAttributes: Record<string, string[]>
  priceBounds?: { min: number; max: number }
}

/**
 * Consulta real ao Supabase para o Catálogo Público B2B.
 */
export async function getCatalogProducts(
  params: CatalogParams,
  authContext: AuthContext,
): Promise<CatalogResult> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')
  const supabase = await createClient()

  // 1. Query base
  let query = supabase
    .from('products')
    .select(
      `
      id,
      sku,
      name,
      slug,
      short_description,
      unit,
      min_quantity,
      multiple_quantity,
      is_featured,
      is_new_arrival,
      category_id,
      brand_id,
      created_at,
      categories!category_id (id, name, slug, is_active),
      brands!brand_id (id, name, slug, is_active),
      product_images (url, alt_text, is_primary, position),
      product_variants (id, sku, name, attributes, is_active)
      `,
      { count: 'exact' },
    )
    .eq('is_active', true)
    .eq('is_published', true)

  // 2. Filtro Categoria
  if (params.category) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', params.category.toLowerCase())
      .eq('is_active', true)
      .maybeSingle()

    const catData = data as { id: string } | null
    if (catData?.id) {
      query = query.eq('category_id', catData.id)
    } else {
      return {
        products: [],
        total: 0,
        page: params.page ?? 1,
        perPage: params.perPage ?? 12,
        totalPages: 1,
        canViewPrices,
        userStatus,
      }
    }
  }

  // 3. Filtro Marcas
  if (params.brands && params.brands.length > 0) {
    const brandSlugs = params.brands.map((b) => b.toLowerCase())
    const { data } = await supabase
      .from('brands')
      .select('id')
      .in('slug', brandSlugs)
      .eq('is_active', true)

    const brandList = (data ?? []) as Array<{ id: string }>
    const brandIds = brandList.map((b) => b.id)
    if (brandIds.length > 0) {
      query = query.in('brand_id', brandIds)
    } else {
      return {
        products: [],
        total: 0,
        page: params.page ?? 1,
        perPage: params.perPage ?? 12,
        totalPages: 1,
        canViewPrices,
        userStatus,
      }
    }
  }

  // 4. Busca por termo (name, sku principal ou sku de variante)
  if (params.query) {
    const q = params.query.trim()
    if (q) {
      const { data: varMatches } = await supabase
        .from('product_variants')
        .select('product_id')
        .ilike('sku', `%${q}%`)
        .eq('is_active', true)

      const variantProdIds = (varMatches ?? []).map((v: { product_id: string }) => v.product_id).filter(Boolean)

      if (variantProdIds.length > 0) {
        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,id.in.(${variantProdIds.join(',')})`)
      } else {
        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      }
    }
  }

  // 5. Toggles
  if (params.isNew) {
    query = query.eq('is_new_arrival', true)
  }
  if (params.isBestSeller) {
    query = query.eq('is_featured', true)
  }

  // 6. Ordenação
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    'nome-asc': { column: 'name', ascending: true },
    'nome-desc': { column: 'name', ascending: false },
    'mais-recentes': { column: 'created_at', ascending: false },
    relevancia: { column: 'created_at', ascending: false },
  }

  const sortConfig = sortMap[params.sort ?? 'relevancia'] ?? sortMap['relevancia']
  query = query.order(sortConfig.column, { ascending: sortConfig.ascending })

  // 7. Paginação
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(48, Math.max(1, params.perPage ?? 12))
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage - 1

  query = query.range(startIndex, endIndex)

  const { data, count, error } = await query

  if (error) {
    console.error('Erro ao consultar catálogo:', error.message)
    return {
      products: [],
      total: 0,
      page,
      perPage,
      totalPages: 1,
      canViewPrices,
      userStatus,
    }
  }

  const rawProducts = (data ?? []) as unknown as Array<{
    id: string
    sku: string
    name: string
    slug: string
    short_description: string | null
    unit: string
    min_quantity: number
    multiple_quantity: number | null
    categories: { id: string; name: string; slug: string; is_active: boolean } | null
    brands: { id: string; name: string; slug: string; is_active: boolean } | null
    product_images: Array<{ url: string; alt_text: string | null; is_primary: boolean; position: number }> | null
    product_variants: Array<{ id: string; sku: string; name: string; attributes: Record<string, string>; is_active: boolean }> | null
  }>

  const total = count ?? 0
  const totalPages = Math.ceil(total / perPage) || 1

  // Se o usuário puder ver preços, buscar preços em LOTE para as variantes principais da página atual
  const primaryVariantIds: string[] = []
  if (canViewPrices) {
    for (const p of rawProducts) {
      const activeVars = (p.product_variants ?? []).filter((v) => v.is_active)
      if (activeVars[0]?.id) {
        primaryVariantIds.push(activeVars[0].id)
      }
    }
  }

  const batchPricing = canViewPrices ? await getCatalogPricingForCurrentCustomer(primaryVariantIds) : new Map<string, PriceInfo>()

  let products: CatalogProduct[] = rawProducts.map((p) => {
    const images = (p.product_images ?? [])
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))
      .map((img) => getProductImageUrl(img.url))

    if (images.length === 0) {
      images.push('/placeholder-product.png')
    }

    const activeVariants = (p.product_variants ?? []).filter((v) => v.is_active)
    const primaryVariant = activeVariants[0]

    let priceInfo: PriceInfo | undefined = undefined
    if (canViewPrices && primaryVariant?.id) {
      priceInfo = batchPricing.get(primaryVariant.id)
    }

    const categoryObj = p.categories && p.categories.is_active ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug } : null
    const brandObj = p.brands && p.brands.is_active ? { id: p.brands.id, name: p.brands.name, slug: p.brands.slug } : null

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      images,
      unit: p.unit,
      min_quantity: p.min_quantity,
      multiple_quantity: p.multiple_quantity ?? 1,
      category: categoryObj,
      brand: brandObj,
      price: priceInfo,
    }
  })

  // 8. Ordenação no Servidor por Preço Efetivo para Aprovados (menor-preco / maior-preco)
  if (canViewPrices && (params.sort === 'menor-preco' || params.sort === 'maior-preco')) {
    const isAsc = params.sort === 'menor-preco'
    products = products.sort((a, b) => {
      const priceA = a.price?.effective_price ?? Infinity
      const priceB = b.price?.effective_price ?? Infinity
      return isAsc ? priceA - priceB : priceB - priceA
    })
  }

  return {
    products,
    total,
    page,
    perPage,
    totalPages,
    canViewPrices,
    userStatus,
  }
}

/**
 * Retorna as opções de filtros reais do banco.
 */
export async function getCatalogFilterOptions(
  _params: CatalogParams,
  authContext: AuthContext,
): Promise<CatalogFilterOptions> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const supabase = await createClient()

  const [{ data: catsData }, { data: brandsListData }] = await Promise.all([
    supabase.from('categories').select('name, slug').eq('is_active', true).order('name'),
    supabase.from('brands').select('name, slug').eq('is_active', true).order('name'),
  ])

  const cats = (catsData ?? []) as Array<{ name: string; slug: string }>
  const brandsList = (brandsListData ?? []) as Array<{ name: string; slug: string }>

  const categories = (cats ?? []).map((c) => ({ name: c.name, slug: c.slug, count: 0 }))
  const brands = (brandsList ?? []).map((b) => ({ name: b.name, slug: b.slug, count: 0 }))
  const units = ['UN', 'CX', 'FD', 'KIT', 'PC']

  return {
    categories,
    subcategories: [],
    brands,
    units,
    availableAttributes: {},
    priceBounds: canViewPrices ? { min: 1, max: 10000 } : undefined,
  }
}

/**
 * Retorna a contagem total de produtos ativos e publicados no catálogo.
 */
export async function getPublicCatalogCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_published', true)

  return count ?? 0
}
