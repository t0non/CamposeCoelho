import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'

export async function getAdminCategories(page = 1, limit = 50) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  const { data, error, count } = await supabase
    .from('categories')
    .select('*', { count: 'exact' })
    .order('position', { ascending: true })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminCategoryById(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAdminBrands(page = 1, limit = 50) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  const { data, error, count } = await supabase
    .from('brands')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminBrandById(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAdminProducts(page = 1, limit = 50, search?: string) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      brand:brands(name)
    `, { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminProductById(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants(*),
      product_images(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAdminInventory(page = 1, limit = 50, search?: string) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('inventories')
    .select(`
      *,
      product:products(id, name, sku),
      variant:product_variants(id, sku, name)
    `, { count: 'exact' })

  // O search filter é simulado aqui (exigiria um RPC real se fosse escalar p/ milhares)
  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminPriceTables(page = 1, limit = 50) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  const { data, error, count } = await supabase
    .from('price_tables')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminPriceTableById(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('price_tables')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
