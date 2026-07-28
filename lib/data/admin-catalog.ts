import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'

export async function getAdminCategories(page = 1, limit = 50, search?: string, status?: string, sort?: string) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('categories')
    .select('*, products(count)', { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }
  
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  // Ordenação
  if (sort === 'name') {
    query = query.order('name', { ascending: true })
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('position', { ascending: true })
  }

  const { data, error, count } = await query.range(start, end)

  if (error) throw error
  return { data: (data as any[]) || [], count: count || 0 }
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
  return data as any
}

export async function getAdminBrands(page = 1, limit = 50, search?: string, status?: string, sort?: string) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('brands')
    .select('*, products(count)', { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  // Ordenação
  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'updated') {
    query = query.order('updated_at', { ascending: false }) // se existir updated_at, se não, ignora ou order name
  } else {
    query = query.order('name', { ascending: true })
  }

  const { data, error, count } = await query.range(start, end)

  if (error) throw error
  return { data: (data as any[]) || [], count: count || 0 }
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
  return data as any
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

export async function getAdminInventory(
  page = 1,
  limit = 50,
  search?: string,
  situation?: string,
  categoryId?: string,
  brandId?: string,
  status?: string,
  sort?: string
) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('inventories')
    .select(`
      *,
      product:products!inner(id, name, sku, category_id, brand_id, is_active, is_published),
      variant:product_variants(id, sku, name)
    `, { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`, { foreignTable: 'products' })
  }

  if (categoryId) {
    query = query.eq('product.category_id', categoryId)
  }

  if (brandId) {
    query = query.eq('product.brand_id', brandId)
  }

  if (status === 'active') {
    query = query.eq('product.is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('product.is_active', false)
  }

  if (situation === 'zerado') {
    query = query.eq('quantity_available', 0)
  } else if (situation === 'baixo') {
    query = query.lte('quantity_available', 10)
  } else if (situation === 'disponivel') {
    query = query.gt('quantity_available', 0)
  }

  // Ordenações
  if (sort === 'name') {
    query = query.order('product(name)', { ascending: true })
  } else if (sort === 'sku') {
    query = query.order('product(sku)', { ascending: true })
  } else if (sort === 'available') {
    query = query.order('quantity_available', { ascending: true })
  } else if (sort === 'reserved') {
    query = query.order('quantity_reserved', { ascending: true })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error, count } = await query.range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminInventoryMovements(inventoryId: string, page = 1, limit = 10) {
  await requireAdmin()
  const supabase = await createClient()
  const start = (page - 1) * limit
  const end = start + limit - 1

  const { data, error, count } = await supabase
    .from('inventory_movements')
    .select(`
      *,
      actor:profiles(full_name)
    `, { count: 'exact' })
    .eq('inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function getAdminPriceTables(
  page = 1,
  limit = 50,
  search?: string,
  status?: string,
  vigence?: string,
  sort?: string
) {
  await requireAdmin()
  const supabase = await createClient()

  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('price_tables')
    .select(`
      *,
      companies(count)
    `, { count: 'exact' })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const now = new Date().toISOString()
  if (vigence === 'vigente') {
    query = query.eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
  } else if (vigence === 'futura') {
    query = query.eq('is_active', true)
      .gt('starts_at', now)
  } else if (vigence === 'expirada') {
    query = query.lt('ends_at', now)
  }

  if (sort === 'name') {
    query = query.order('name', { ascending: true })
  } else if (sort === 'starts_at') {
    query = query.order('starts_at', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error, count } = await query.range(start, end)

  if (error) throw error

  // Obter contagem de preços por tabela de forma manual para evitar joins pesados
  const formattedData = await Promise.all((data || []).map(async (table: any) => {
    const { count: pricesCount } = await supabase
      .from('price_table_products')
      .select('*', { count: 'exact', head: true })
      .eq('price_table_id', table.id)
    return {
      ...table,
      prices_count: pricesCount || 0,
      companies_count: table.companies?.[0]?.count || 0
    }
  }))

  return { data: formattedData, count: count || 0 }
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

export async function getAdminPriceEntries(
  priceTableId: string,
  page = 1,
  limit = 50,
  search?: string,
  categoryId?: string,
  brandId?: string
) {
  await requireAdmin()
  const supabase = await createClient()
  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('product_variants')
    .select(`
      *,
      product:products!inner(id, name, sku, category_id, brand_id),
      prices:price_table_products(
        id,
        price_table_id,
        unit_price,
        promotional_price,
        promotion_starts_at,
        promotion_ends_at,
        is_active,
        min_quantity
      )
    `, { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,product.name.ilike.%${search}%,product.sku.ilike.%${search}%`)
  }

  if (categoryId) {
    query = query.eq('product.category_id', categoryId)
  }

  if (brandId) {
    query = query.eq('product.brand_id', brandId)
  }

  const { data, error, count } = await query
    .order('sku', { ascending: true })
    .range(start, end)

  if (error) throw error

  // Filtrar prices da tabela no JS e formatar resposta
  const formatted = (data || []).map((item: any) => {
    const tablePrices = (item.prices || []).filter((p: any) => p.price_table_id === priceTableId)
    return {
      ...item,
      prices: tablePrices
    }
  })

  return { data: formatted, count: count || 0 }
}
