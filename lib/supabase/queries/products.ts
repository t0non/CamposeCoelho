import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct } from '@/types/product.types'
import type { Database } from '@/types/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type BrandRow = Database['public']['Tables']['brands']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']
type ImageRow = Database['public']['Tables']['product_images']['Row']

interface ProductWithJoins extends ProductRow {
  category: Pick<CategoryRow, 'id' | 'name' | 'slug'> | null
  brand: Pick<BrandRow, 'id' | 'name' | 'slug'> | null
  product_images: Pick<ImageRow, 'url' | 'is_primary'>[]
}

interface PriceTableRow {
  is_default: boolean | null
}

interface PriceQueryRow {
  product_id: string
  unit_price: number
  promotional_price: number | null
  promotion_starts_at: string | null
  promotion_ends_at: string | null
  price_table: PriceTableRow | null
}

/**
 * Lista produtos públicos para o catálogo.
 * Preços NÃO são incluídos nesta query.
 */
export async function getProducts(options?: {
  categorySlug?: string
  brandSlug?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<Omit<CatalogProduct, 'price'>[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(
      `
      id, sku, name, slug, unit, min_quantity, multiple_quantity, weight_grams, is_active, created_at, updated_at,
      category:categories!products_category_id_fkey(id, name, slug),
      brand:brands!products_brand_id_fkey(id, name, slug),
      product_images(url, is_primary)
    `,
    )
    .eq('is_active', true)

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  const { data, error } = await query
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 20) - 1,
    )
    .order('name')

  if (error) throw error

  const rows = (data ?? []) as unknown as ProductWithJoins[]

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    images: row.product_images?.map((img) => img.url) ?? [],
    unit: row.unit,
    min_quantity: row.min_quantity,
    category: row.category ?? null,
    brand: row.brand ?? null,
  }))
}

type PriceInfo = {
  unit_price: number
  promotional_price: number | null
  effective_price: number
  is_on_promotion: boolean
}

/**
 * Busca preços para uma lista de product IDs.
 * Só deve ser chamada quando ctx.canViewPrices === true.
 */
export async function getProductPrices(
  productIds: string[],
  ctx: AuthContext,
): Promise<Record<string, PriceInfo>> {
  if (!ctx.canViewPrices) {
    throw new Error('FORBIDDEN: Preços não disponíveis para este perfil')
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('price_table_products')
    .select(
      `
      product_id,
      unit_price,
      promotional_price,
      promotion_starts_at,
      promotion_ends_at,
      price_table:price_tables!price_table_products_price_table_id_fkey(is_default)
    `,
    )
    .in('product_id', productIds)

  if (error) throw error

  const rows = (data ?? []) as unknown as PriceQueryRow[]
  const priceMap: Record<string, PriceInfo> = {}

  for (const row of rows) {
    if (!row.price_table?.is_default) continue

    const isOnPromotion =
      !!row.promotional_price &&
      (!row.promotion_starts_at || row.promotion_starts_at <= now) &&
      (!row.promotion_ends_at || row.promotion_ends_at >= now)

    priceMap[row.product_id] = {
      unit_price: row.unit_price,
      promotional_price: row.promotional_price,
      effective_price: isOnPromotion ? row.promotional_price! : row.unit_price,
      is_on_promotion: isOnPromotion,
    }
  }

  return priceMap
}

/**
 * Busca um produto pelo slug.
 * Preço NÃO é incluído.
 */
export async function getProductBySlug(slug: string): Promise<ProductWithJoins | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories!products_category_id_fkey(id, name, slug),
      brand:brands!products_brand_id_fkey(id, name, slug),
      product_images(url, is_primary)
    `,
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data as unknown as ProductWithJoins
}

/**
 * Busca inventário de um produto na tabela 'inventories'.
 */
export async function getProductInventory(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventories')
    .select('quantity_available')
    .eq('product_id', productId)
    .single()

  return data
}
