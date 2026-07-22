import type { Database } from './database.types'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type BrandRow = Database['public']['Tables']['brands']['Row']
type PriceTableProductRow =
  Database['public']['Tables']['price_table_products']['Row']
type InventoryRow = Database['public']['Tables']['inventories']['Row']

// Produto público (sem preço)
export type PublicProduct = Omit<ProductRow, never>

// Produto com preço — NUNCA retornado para visitantes/pendentes
export interface ProductWithPrice extends ProductRow {
  price: PriceInfo
  inventory: Pick<InventoryRow, 'quantity_available'>
}

export interface PriceInfo {
  unit_price: number
  promotional_price: number | null
  effective_price: number // unit_price ou promotional_price se válido
  is_on_promotion: boolean
}

// Produto listado no catálogo (server component decide qual retornar)
export interface CatalogProduct {
  id: string
  sku: string
  name: string
  slug: string
  images: string[]
  unit: string
  min_quantity: number
  multiple_quantity?: number
  category: Pick<CategoryRow, 'id' | 'name' | 'slug'> | null
  brand: Pick<BrandRow, 'id' | 'name' | 'slug'> | null
  // undefined = visitante (preço bloqueado); number = aprovado
  price?: PriceInfo
}

export type { ProductRow, CategoryRow, BrandRow, PriceTableProductRow, InventoryRow }
