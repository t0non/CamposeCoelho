import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type ProductRow = any
type VariantRow = any
type ImageRow = any
type CategoryRow = any
type BrandRow = any

export type AdminProductListRow = ProductRow & {
  category: Pick<CategoryRow, 'id' | 'name'> | null
  brand: Pick<BrandRow, 'id' | 'name'> | null
  variants: [{ count: number }]
  images: Pick<ImageRow, 'url' | 'alt_text'>[]
}

export async function getAdminProducts(params: {
  q?: string
  category?: string
  brand?: string
  status?: string
  publication?: string
  sort?: string
  page?: number
  pageSize?: number
}) {
  const supabase = (await createClient()) as any

  let query = supabase.from('products').select(`
    *,
    category:categories(id, name),
    brand:brands(id, name),
    variants:product_variants(count),
    images:product_images(url, alt_text)
  `, { count: 'exact' })

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%,sku.ilike.%${params.q}%`)
  }

  if (params.category) {
    query = query.eq('category_id', params.category)
  }

  if (params.brand) {
    query = query.eq('brand_id', params.brand)
  }

  if (params.status === 'active') {
    query = query.eq('is_active', true)
  } else if (params.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  if (params.publication === 'published') {
    query = query.eq('is_published', true)
  } else if (params.publication === 'draft') {
    query = query.eq('is_published', false)
  }

  // Ordering
  switch (params.sort) {
    case 'name_asc':
      query = query.order('name', { ascending: true })
      break
    case 'name_desc':
      query = query.order('name', { ascending: false })
      break
    case 'sku_asc':
      query = query.order('sku', { ascending: true })
      break
    case 'created_asc':
      query = query.order('created_at', { ascending: true })
      break
    case 'updated_asc':
      query = query.order('updated_at', { ascending: true })
      break
    case 'updated_desc':
    default:
      query = query.order('updated_at', { ascending: false })
      break
  }

  // Pegar imagens apenas a principal
  // Devido a limitações do PostgREST para filtrar relacionamentos 1-to-many na mesma query raiz
  // vamos processar depois, mas order by null para evitar problemas.
  
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching admin products:', error)
    return { data: [], count: 0, error }
  }

  return {
    data: data as AdminProductListRow[],
    count: count || 0,
    error: null,
  }
}

export async function getAdminProductById(id: string) {
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getAdminProductVariants(productId: string) {
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from('product_variants')
    .select(`*, inventories(quantity_available, quantity_reserved)`)
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function getAdminProductImages(productId: string) {
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true })

  if (error) return []
  return data
}
