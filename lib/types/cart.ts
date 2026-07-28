/**
 * Tipos compartilhados do carrinho (BLOCO 12A).
 *
 * Este módulo NÃO importa código de servidor — pode ser usado com segurança
 * tanto em Server Components quanto em Client Components (import type).
 *
 * A forma de `CartLineItem` espelha exatamente as colunas retornadas pela RPC
 * `get_active_cart_with_prices` (leitura set-based). Nenhum campo sensível de
 * autorização (profile_id, price_table_id, company_id de terceiros) é exposto.
 */
export interface CartLineItem {
  item_id: string
  product_id: string
  variant_id: string | null
  product_name: string
  product_sku: string
  variant_name: string | null
  variant_sku: string | null
  image_url: string | null
  unit: string | null
  min_quantity: number
  multiple_quantity: number | null
  quantity: number
  unit_price: number | null
  promotional_price: number | null
  effective_price: number | null
  is_on_promotion: boolean
  line_total: number | null
  stock_available: number
  is_available: boolean
  unavailable_reason: string | null
}

/**
 * Resumo agregado do carrinho ativo, derivado de `CartLineItem[]`.
 * `count` é a soma das unidades; `subtotal` é a soma dos line_total estimados.
 */
export interface CartSummary {
  items: CartLineItem[]
  count: number
  subtotal: number
  hasUnavailable: boolean
}
