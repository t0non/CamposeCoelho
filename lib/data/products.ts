import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct, PriceInfo } from '@/types/product.types'
import { getProductImageUrl } from '@/lib/utils/storage-url'

export interface ProductDetailInfo {
  description: string
  longDescription: string
  specifications: Record<string, string>
  ean?: string
  attributes: Record<string, string>
  relatedProductIds?: string[]
  applications?: string[]
  instructions?: string
  packaging?: {
    type?: string
    unitsPerPackage?: number
    packageDimensions?: string
    packageWeight?: string
    unitsPerMasterBox?: number
    masterBoxQuantity?: number
    masterBoxDimensions?: string
    boxDimensions?: string
    masterBoxWeight?: string
    grossWeight?: string
    stackabilityMax?: string
  }
  ncm?: string
  warranty?: string
}

export interface VolumeDiscountTier {
  minQuantity: number
  maxQuantity?: number
  discountPercentage: number
  unitPrice: number
  pricePerUnit: number
}

export interface FullProductData {
  id: string
  sku: string
  name: string
  slug: string
  unit: string
  min_quantity: number
  multiple_quantity: number
  images: string[]
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  price?: PriceInfo
  detail: ProductDetailInfo
  variants: Array<{ id: string; sku: string; name: string; attributes: Record<string, string> }>
  volumeDiscounts?: VolumeDiscountTier[]
  attributes: Record<string, string>
  exactStock?: number
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

type RawProduct = {
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
  inventories: Array<{ quantity_available: number; quantity_reserved: number }> | null
}

/**
 * Busca produto por slug no Supabase remoto.
 */
export async function getProductBySlug(
  slug: string,
  authContext: AuthContext,
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
      inventories (quantity_available, quantity_reserved)
      `,
    )
    .eq('slug', sanitizedSlug)
    .eq('is_active', true)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const p = data as unknown as RawProduct

  const images = (p.product_images ?? [])
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))
    .map((img) => getProductImageUrl(img.url))

  if (images.length === 0) {
    images.push('/placeholder-product.png')
  }

  const activeVariants = (p.product_variants ?? [])
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      attributes: v.attributes ?? {},
    }))

  let priceInfo: PriceInfo | undefined = undefined
  const primaryVariant = activeVariants[0]

  if (canViewPrices && primaryVariant?.id) {
    const { data: priceResult } = (await (supabase.rpc as any)('get_effective_price_for_session', {
      p_variant_id: primaryVariant.id,
    })) as { data: Array<{ unit_price: number; promotional_price: number | null; effective_price: number; is_on_promotion: boolean }> | null }

    if (priceResult && priceResult.length > 0) {
      const row = priceResult[0]
      priceInfo = {
        unit_price: row.unit_price,
        promotional_price: row.promotional_price,
        effective_price: row.effective_price,
        is_on_promotion: row.is_on_promotion,
      }
    }
  }

  let exactStock: number | undefined = undefined
  if (canViewPrices && p.inventories && p.inventories.length > 0) {
    const totalAvail = p.inventories.reduce((acc: number, inv: { quantity_available: number }) => acc + (inv.quantity_available ?? 0), 0)
    const totalReser = p.inventories.reduce((acc: number, inv: { quantity_reserved: number }) => acc + (inv.quantity_reserved ?? 0), 0)
    exactStock = Math.max(0, totalAvail - totalReser)
  }

  const categoryObj = p.categories && p.categories.is_active ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug } : null
  const brandObj = p.brands && p.brands.is_active ? { id: p.brands.id, name: p.brands.name, slug: p.brands.slug } : null
  const mainAttrs: Record<string, string> = primaryVariant?.attributes ?? {}

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    unit: p.unit,
    min_quantity: p.min_quantity,
    multiple_quantity: p.multiple_quantity ?? 1,
    images,
    category: categoryObj,
    brand: brandObj,
    price: priceInfo,
    variants: activeVariants,
    attributes: mainAttrs,
    volumeDiscounts: [],
    exactStock,
    canViewPrices,
    userStatus,
    detail: {
      description: p.short_description ?? p.description ?? p.name,
      longDescription: p.description ?? p.short_description ?? p.name,
      specifications: {
        'Unidade de Venda': p.unit,
        'Quantidade Mínima': `${p.min_quantity} ${p.unit}`,
        'Múltiplo de Compra': `${p.multiple_quantity ?? 1} ${p.unit}`,
        'Código de Referência (SKU)': p.sku,
      },
      attributes: mainAttrs,
      applications: [],
      instructions: undefined,
      packaging: {
        type: 'Caixa Comercial',
        unitsPerPackage: p.min_quantity,
        packageDimensions: 'Conforme padrão do fabricante',
        packageWeight: 'N/A',
        unitsPerMasterBox: p.multiple_quantity ?? 1,
        masterBoxQuantity: p.multiple_quantity ?? 1,
        masterBoxDimensions: 'Conforme padrão do fabricante',
        boxDimensions: 'Conforme padrão do fabricante',
        masterBoxWeight: 'N/A',
        grossWeight: 'N/A',
        stackabilityMax: '10 caixas',
      },
      ncm: 'N/A',
      warranty: 'Garantia contra defeito de fabricação',
    },
  }
}

/**
 * Retorna produtos relacionados.
 */
export async function getRelatedProducts(
  currentProduct: FullProductData,
  authContext: AuthContext,
): Promise<CatalogProduct[]> {
  const supabase = await createClient()
  const canViewPrices = Boolean(authContext?.canViewPrices)

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
      product_images (url, is_primary, position),
      product_variants (id, is_active)
      `,
    )
    .eq('is_active', true)
    .eq('is_published', true)
    .neq('id', currentProduct.id)
    .limit(4)

  if (currentProduct.category?.id) {
    query = query.eq('category_id', currentProduct.category.id)
  }

  const { data } = await query
  const rels = (data ?? []) as unknown as Array<{
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
    rels.map(async (p) => {
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

/**
 * Retorna produtos recomendados "Comprados Juntos".
 */
export async function getFrequentlyBoughtTogether(
  _currentProduct: FullProductData,
  _authContext: AuthContext,
): Promise<CatalogProduct[]> {
  return []
}
