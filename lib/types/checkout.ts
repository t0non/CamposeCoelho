export interface CheckoutAddress {
  id: string
  label: string
  zip_code: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  is_default: boolean
}

export interface CheckoutOrderItemSnapshot {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  product_name: string | null
  product_sku: string | null
  variant_name: string | null
  variant_sku: string | null
  promotional_price: number | null
  price_table_id: string | null
  min_quantity_applied: number | null
}

export interface CheckoutAddressSnapshot {
  label: string
  zip_code: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

export interface CheckoutOrderSummary {
  id: string
  order_number: string
  status: string
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  created_at: string
  shipping_address_snapshot: CheckoutAddressSnapshot | null
  order_items: CheckoutOrderItemSnapshot[]
}
