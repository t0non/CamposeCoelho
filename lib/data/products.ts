import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct, PriceInfo } from '@/types/product.types'
import { getProductImageUrl } from '@/lib/utils/storage-url'
import {
  getEffectivePriceForCurrentCustomer,
  getEffectiveProductLevelPriceForCurrentCustomer,
  getCatalogPricingForCurrentCustomer,
} from '@/lib/data/pricing'

export interface ProductDetailInfo {
  longDescription?: string
  instructions?: string[]
  applications?: string[]
  packaging?: any
  masterBox?: any
  dimensions?: string
  weight?: string
  origin?: string
  ncm?: string
  ean?: string
  dun14?: string
  warranty?: string
}

export interface VolumeDiscountTier {
  minQuantity: number
  maxQuantity?: number
  discountPercent?: number
  discountPercentage?: number
  unitPrice?: number
  pricePerUnit?: number
}

export interface FullProductData {
  id: string
  sku: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  unit: string
  min_quantity: number
  multiple_quantity: number
  is_active: boolean
  is_published: boolean
  images: string[]
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  price?: PriceInfo
  detail: ProductDetailInfo
  variants: Array<{ id: string; sku: string; name: string; attributes: Record<string, string>; availableStock: number }>
  /** Variante que o servidor resolveu para exibição/preço (null quando o produto não tem variantes). */
  currentVariantId: string | null
  volumeDiscounts?: VolumeDiscountTier[]
  attributes: Record<string, string>
  exactStock?: number
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

/**
 * Busca produto por slug no Supabase remoto.
 */
export async function getProductBySlug(
  slug: string,
  authContext: AuthContext,
  selectedVariantId?: string,
): Promise<FullProductData | null> {
  if (!slug) return null
  const sanitizedSlug = slug.toLowerCase().trim()

  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      sku,
      name,
      slug,
      description,
      short_description,
      unit,
      min_quantity,
      multiple_quantity,
      is_active,
      is_published,
      category_id,
      brand_id,
      categories!category_id (id, name, slug, is_active),
      brands!brand_id (id, name, slug, is_active),
      product_images (url, alt_text, is_primary, position),
      product_variants (id, sku, name, attributes, is_active),
      inventories (variant_id, quantity_available, quantity_reserved)
      `,
    )
    .eq('slug', sanitizedSlug)
    .eq('is_active', true)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) return null

  const raw = data as unknown as {
    id: string
    sku: string
    name: string
    slug: string
    description: string | null
    short_description: string | null
    unit: string
    min_quantity: number
    multiple_quantity: number | null
    is_active: boolean
    is_published: boolean
    categories: { id: string; name: string; slug: string; is_active: boolean } | null
    brands: { id: string; name: string; slug: string; is_active: boolean } | null
    product_images: Array<{ url: string; alt_text: string | null; is_primary: boolean; position: number }> | null
    product_variants: Array<{ id: string; sku: string; name: string; attributes: Record<string, string>; is_active: boolean }> | null
    inventories: Array<{ variant_id: string | null; quantity_available: number; quantity_reserved: number }> | null
  }

  // Filtrar variantes ativas. Produtos SEM nenhuma variante ativa são
  // válidos (variant_id null no carrinho) — não retornamos 404 apenas por
  // ausência de variantes.
  const activeVariants = (raw.product_variants ?? []).filter((v) => v.is_active)

  // Estoque por variante (available_to_sell = max(0, available - reserved)).
  // A chave `null` representa o estoque a nível de PRODUTO (variant_id NULL),
  // relevante apenas quando o produto não tem variantes.
  const stockByVariant = new Map<string | null, number>()
  for (const inv of raw.inventories ?? []) {
    const key = inv.variant_id ?? null
    const usable = Math.max(0, (inv.quantity_available ?? 0) - (inv.quantity_reserved ?? 0))
    stockByVariant.set(key, (stockByVariant.get(key) ?? 0) + usable)
  }

  // Selecionar variante válida (undefined quando o produto não tem variantes).
  let currentVariant = activeVariants[0]
  if (selectedVariantId) {
    const matched = activeVariants.find((v) => v.id === selectedVariantId)
    if (matched) currentVariant = matched
  }

  const currentStock = currentVariant
    ? (stockByVariant.get(currentVariant.id) ?? 0)
    : (stockByVariant.get(null) ?? 0)

  // Se o cliente puder ver preços, buscar preço efetivo: por variante quando
  // existir, ou a nível de produto (variant_id NULL) quando não houver
  // nenhuma variante ativa.
  let priceInfo: PriceInfo | undefined = undefined
  if (canViewPrices) {
    priceInfo = currentVariant?.id
      ? await getEffectivePriceForCurrentCustomer(currentVariant.id)
      : await getEffectiveProductLevelPriceForCurrentCustomer(raw.id)
  }

  const images = (raw.product_images ?? [])
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))
    .map((img) => getProductImageUrl(img.url))

  if (images.length === 0) {
    images.push('/placeholder-product.png')
  }

  const categoryObj = raw.categories && raw.categories.is_active ? { id: raw.categories.id, name: raw.categories.name, slug: raw.categories.slug } : null
  const brandObj = raw.brands && raw.brands.is_active ? { id: raw.brands.id, name: raw.brands.name, slug: raw.brands.slug } : null

  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    short_description: raw.short_description,
    unit: raw.unit,
    min_quantity: raw.min_quantity,
    multiple_quantity: raw.multiple_quantity ?? 1,
    is_active: raw.is_active,
    is_published: raw.is_published,
    images,
    category: categoryObj,
    brand: brandObj,
    price: priceInfo,
    detail: {
      packaging: `Caixa com ${raw.min_quantity} ${raw.unit}`,
      masterBox: raw.multiple_quantity ? `Master com ${raw.multiple_quantity} unidades` : undefined,
    },
    variants: activeVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      attributes: (v.attributes as Record<string, string>) ?? {},
      availableStock: stockByVariant.get(v.id) ?? 0,
    })),
    currentVariantId: currentVariant?.id ?? null,
    attributes: {},
    exactStock: canViewPrices ? currentStock : undefined,
    canViewPrices,
    userStatus,
  }
}

/**
 * Retorna produtos relacionados (da mesma categoria ou marca).
 */
export async function getRelatedProducts(
  currentProduct: FullProductData,
  authContext: AuthContext,
  limit: number = 4,
): Promise<CatalogProduct[]> {
  if (!currentProduct) return []
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const supabase = await createClient()

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
      categories!category_id (id, name, slug, is_active),
      brands!brand_id (id, name, slug, is_active),
      product_images (url, alt_text, is_primary, position),
      product_variants (id, sku, name, attributes, is_active)
      `,
    )
    .eq('is_active', true)
    .eq('is_published', true)
    .neq('id', currentProduct.id)
    .limit(limit)

  if (currentProduct.category?.id) {
    query = query.eq('category_id', currentProduct.category.id)
  }

  const { data } = await query
  const rawList = (data ?? []) as unknown as Array<{
    id: string
    sku: string
    name: string
    slug: string
    unit: string
    min_quantity: number
    multiple_quantity: number | null
    categories: { id: string; name: string; slug: string; is_active: boolean } | null
    brands: { id: string; name: string; slug: string; is_active: boolean } | null
    product_images: Array<{ url: string; alt_text: string | null; is_primary: boolean; position: number }> | null
    product_variants: Array<{ id: string; sku: string; name: string; attributes: Record<string, string>; is_active: boolean }> | null
  }>

  const primaryVariantIds: string[] = []
  if (canViewPrices) {
    for (const p of rawList) {
      const activeVars = (p.product_variants ?? []).filter((v) => v.is_active)
      if (activeVars[0]?.id) primaryVariantIds.push(activeVars[0].id)
    }
  }

  const batchPricing = canViewPrices ? await getCatalogPricingForCurrentCustomer(primaryVariantIds) : new Map<string, PriceInfo>()

  return rawList.map((p) => {
    const images = (p.product_images ?? [])
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))
      .map((img) => getProductImageUrl(img.url))

    if (images.length === 0) images.push('/placeholder-product.png')

    const activeVars = (p.product_variants ?? []).filter((v) => v.is_active)
    const primaryVar = activeVars[0]
    const price = canViewPrices && primaryVar?.id ? batchPricing.get(primaryVar.id) : undefined

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
      price,
    }
  })
}

/**
 * Produtos "Comprados Juntos" desativado até a Etapa 12.
 */
export async function getFrequentlyBoughtTogether(
  _currentProduct: FullProductData,
  _authContext: AuthContext,
): Promise<CatalogProduct[]> {
  return []
}
