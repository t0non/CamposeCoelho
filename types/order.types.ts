import type { Database } from './database.types'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderItemRow = Database['public']['Tables']['order_items']['Row']
type AddressRow = Database['public']['Tables']['addresses']['Row']

export type OrderStatus = Database['public']['Enums']['order_status']

export interface OrderItem extends OrderItemRow {
  product: {
    id: string
    sku: string
    name: string
    slug: string
    images: string[]
    unit: string
  }
}

export interface Order extends OrderRow {
  items: OrderItem[]
  shipping_address: AddressRow | null
}

export interface OrderSummary
  extends Pick<
    OrderRow,
    | 'id'
    | 'order_number'
    | 'status'
    | 'total'
    | 'created_at'
    | 'updated_at'
  > {
  item_count: number
}

export type { OrderRow, OrderItemRow, AddressRow }
