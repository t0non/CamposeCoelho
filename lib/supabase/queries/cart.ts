import { createClient } from '@/lib/supabase/server'
import { requireApprovedAccess } from '@/lib/supabase/auth'
import type { Database } from '@/types/database.types'

type CartItemRow = Database['public']['Tables']['cart_items']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

interface CartItemWithProduct extends CartItemRow {
  product: Pick<
    ProductRow,
    'id' | 'name' | 'slug' | 'unit' | 'min_quantity' | 'multiple_quantity'
  > | null
}

interface PriceQueryRow {
  product_id: string
  unit_price: number
  promotional_price: number | null
  promotion_starts_at: string | null
  promotion_ends_at: string | null
}

/**
 * Busca itens do carrinho do usuário autenticado.
 * Somente clientes aprovados podem ter carrinho.
 */
export async function getCartItems() {
  const ctx = await requireApprovedAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `
      id, quantity, updated_at, profile_id, product_id, created_at,
      product:products!cart_items_product_id_fkey(
        id, name, slug, unit, min_quantity, multiple_quantity
      )
    `,
    )
    .eq('profile_id', ctx.user!.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as CartItemWithProduct[]
}

/**
 * Busca itens do carrinho com preços.
 */
export async function getCartWithPrices() {
  const ctx = await requireApprovedAccess()
  const supabase = await createClient()

  const items = await getCartItems()
  const productIds = items
    .map((item) => item.product?.id)
    .filter((id): id is string => !!id)

  if (productIds.length === 0) return []

  // Buscar tabela de preço associada à empresa
  let priceTableId: string | null = null
  if (ctx.company?.id) {
    const { data: companyData } = await supabase
      .from('companies')
      .select('price_table_id')
      .eq('id', ctx.company.id)
      .single()
    const company = companyData as Pick<CompanyRow, 'price_table_id'> | null
    priceTableId = company?.price_table_id ?? null
  }

  let priceQuery = supabase
    .from('price_table_products')
    .select('product_id, unit_price, promotional_price, promotion_starts_at, promotion_ends_at')
    .in('product_id', productIds)

  if (priceTableId) {
    priceQuery = priceQuery.eq('price_table_id', priceTableId)
  }

  const { data: pricesData } = await priceQuery

  const prices = (pricesData ?? []) as unknown as PriceQueryRow[]
  const now = new Date().toISOString()

  const priceMap = new Map(
    prices.map((p) => {
      const isPromo =
        !!p.promotional_price &&
        (!p.promotion_starts_at || p.promotion_starts_at <= now) &&
        (!p.promotion_ends_at || p.promotion_ends_at >= now)
      return [
        p.product_id,
        {
          unit_price: p.unit_price,
          promotional_price: p.promotional_price,
          effective_price: isPromo ? p.promotional_price! : p.unit_price,
          is_on_promotion: isPromo,
        },
      ]
    }),
  )

  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    product: item.product,
    price: item.product ? priceMap.get(item.product.id) ?? null : null,
  }))
}
