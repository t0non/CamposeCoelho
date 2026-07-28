import { createClient } from '@/lib/supabase/server'
import { requireApprovedAccess } from '@/lib/supabase/auth'
import type { Database } from '@/types/database.types'

type OrderRow = Database['public']['Tables']['orders']['Row']

interface OrderWithCount extends OrderRow {
  order_items: { id: string }[]
}

/**
 * Busca pedidos do usuário autenticado.
 * Requer acesso aprovado.
 */
export async function getMyOrders() {
  const ctx = await requireApprovedAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id, order_number, status, total, created_at, updated_at,
      order_items(id)
    `,
    )
    .eq('profile_id', ctx.user!.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as OrderWithCount[]

  return rows.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total: order.total,
    created_at: order.created_at,
    updated_at: order.updated_at,
    item_count: order.order_items?.length ?? 0,
  }))
}

/**
 * Busca detalhes de um pedido específico.
 * Verifica que o pedido pertence ao usuário autenticado.
 */
export async function getOrderById(orderId: string) {
  const ctx = await requireApprovedAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items(
        *,
        product:products!order_items_product_id_fkey(id, sku, name, slug, unit)
      ),
      shipping_address:addresses!orders_shipping_address_id_fkey(*)
    `,
    )
    .eq('id', orderId)
    .eq('profile_id', ctx.user!.id)
    .single()

  if (error) return null
  return data
}
