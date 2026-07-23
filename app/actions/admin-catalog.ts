'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper de autorização server-only: apenas usuários com role = 'admin' podem executar
async function requireAdminSession() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Acesso negado: não autenticado.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile as any).role !== 'admin') {
    throw new Error('Acesso negado: apenas administradores possuem permissão.')
  }

  return { supabase, user }
}

// Invalidação centralizada de cache para atualizar visualizações públicas e administrativas
function revalidateCatalogPages(slug?: string) {
  revalidatePath('/')
  revalidatePath('/catalogo')
  revalidatePath('/busca')
  if (slug) {
    revalidatePath(`/produto/${slug}`)
  }
}

// Helper para gravação imutável de Audit Logs
async function createAuditLog(
  supabase: any,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string | null,
  payload: Record<string, any>,
) {
  await (supabase.from('audit_logs') as any).insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    payload,
  })
}

// ==========================================
// 1. CATEGORIAS (CRUD & Desativação Lógica)
// ==========================================

export async function createCategoryAction(data: {
  name: string
  slug: string
  description?: string
  position?: number
  is_active?: boolean
  seo_title?: string
  seo_description?: string
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: created, error } = await (supabase.from('categories') as any)
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      position: data.position ?? 0,
      is_active: data.is_active ?? true,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao criar categoria: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'CATEGORY_CREATED', 'categories', created.id, data)
  revalidatePath('/admin/categorias')
  revalidateCatalogPages()

  return { success: true, category: created }
}

export async function updateCategoryAction(
  id: string,
  data: {
    name?: string
    slug?: string
    description?: string
    position?: number
    is_active?: boolean
    seo_title?: string
    seo_description?: string
  },
) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('categories') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao atualizar categoria: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'CATEGORY_UPDATED', 'categories', id, data)
  revalidatePath('/admin/categorias')
  revalidateCatalogPages()

  return { success: true, category: updated }
}

export async function deactivateCategoryAction(id: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('categories') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao desativar categoria: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'CATEGORY_DEACTIVATED', 'categories', id, { is_active: false })
  revalidatePath('/admin/categorias')
  revalidateCatalogPages()

  return { success: true, category: updated }
}

// ==========================================
// 2. MARCAS (CRUD & Desativação Lógica)
// ==========================================

export async function createBrandAction(data: {
  name: string
  slug: string
  description?: string
  logo_url?: string
  is_active?: boolean
  seo_title?: string
  seo_description?: string
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: created, error } = await (supabase.from('brands') as any)
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      logo_url: data.logo_url || null,
      is_active: data.is_active ?? true,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao criar marca: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'BRAND_CREATED', 'brands', created.id, data)
  revalidatePath('/admin/marcas')
  revalidateCatalogPages()

  return { success: true, brand: created }
}

export async function updateBrandAction(
  id: string,
  data: {
    name?: string
    slug?: string
    description?: string
    logo_url?: string
    is_active?: boolean
    seo_title?: string
    seo_description?: string
  },
) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('brands') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao atualizar marca: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'BRAND_UPDATED', 'brands', id, data)
  revalidatePath('/admin/marcas')
  revalidateCatalogPages()

  return { success: true, brand: updated }
}

export async function deactivateBrandAction(id: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('brands') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao desativar marca: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'BRAND_DEACTIVATED', 'brands', id, { is_active: false })
  revalidatePath('/admin/marcas')
  revalidateCatalogPages()

  return { success: true, brand: updated }
}

// ==========================================
// 3. PRODUTOS & VARIANTES
// ==========================================

export async function createProductAction(data: {
  name: string
  slug: string
  sku: string
  description?: string
  short_description?: string
  category_id?: string
  brand_id?: string
  unit?: string
  min_quantity?: number
  multiple_quantity?: number
  weight_grams?: number
  is_active?: boolean
  is_published?: boolean
  is_featured?: boolean
  is_new_arrival?: boolean
  seo_title?: string
  seo_description?: string
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: created, error } = await (supabase.from('products') as any)
    .insert({
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      description: data.description || null,
      short_description: data.short_description || null,
      category_id: data.category_id || null,
      brand_id: data.brand_id || null,
      unit: data.unit || 'UN',
      min_quantity: data.min_quantity ?? 1,
      multiple_quantity: data.multiple_quantity ?? 1,
      weight_grams: data.weight_grams || null,
      is_active: data.is_active ?? true,
      is_published: data.is_published ?? false,
      is_featured: data.is_featured ?? false,
      is_new_arrival: data.is_new_arrival ?? false,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao criar produto: ${error.message}` }
  }

  // Criar registro de estoque padrão para o produto
  await (supabase.from('inventories') as any).insert({
    product_id: created.id,
    variant_id: null,
    quantity_available: 0,
    quantity_reserved: 0,
    min_stock_alert: 5,
  })

  await createAuditLog(supabase, user.id, 'PRODUCT_CREATED', 'products', created.id, data)
  revalidatePath('/admin/produtos')
  revalidateCatalogPages(created.slug)

  return { success: true, product: created }
}

export async function updateProductAction(
  id: string,
  data: Partial<{
    name: string
    slug: string
    sku: string
    description: string
    short_description: string
    category_id: string
    brand_id: string
    unit: string
    min_quantity: number
    multiple_quantity: number
    weight_grams: number
    is_active: boolean
    is_published: boolean
    is_featured: boolean
    is_new_arrival: boolean
    seo_title: string
    seo_description: string
  }>,
) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('products') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao atualizar produto: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRODUCT_UPDATED', 'products', id, data)
  revalidatePath('/admin/produtos')
  revalidateCatalogPages(updated.slug)

  return { success: true, product: updated }
}

export async function toggleProductPublicationAction(id: string, isPublished: boolean) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('products') as any)
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao alterar publicação: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRODUCT_PUBLICATION_TOGGLED', 'products', id, { is_published: isPublished })
  revalidatePath('/admin/produtos')
  revalidateCatalogPages(updated.slug)

  return { success: true, product: updated }
}

export async function deactivateProductAction(id: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('products') as any)
    .update({ is_active: false, is_published: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao arquivar produto: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRODUCT_DEACTIVATED', 'products', id, { is_active: false, is_published: false })
  revalidatePath('/admin/produtos')
  revalidateCatalogPages(updated.slug)

  return { success: true, product: updated }
}

export async function createVariantAction(data: {
  product_id: string
  sku: string
  name: string
  attributes?: Record<string, any>
  barcode?: string
  min_quantity?: number
  multiple_quantity?: number
  is_active?: boolean
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: created, error } = await (supabase.from('product_variants') as any)
    .insert({
      product_id: data.product_id,
      sku: data.sku,
      name: data.name,
      attributes: data.attributes || {},
      barcode: data.barcode || null,
      min_quantity: data.min_quantity ?? 1,
      multiple_quantity: data.multiple_quantity ?? 1,
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao criar variante: ${error.message}` }
  }

  // Criar estoque para a variante
  await (supabase.from('inventories') as any).insert({
    product_id: data.product_id,
    variant_id: created.id,
    quantity_available: 0,
    quantity_reserved: 0,
    min_stock_alert: 5,
  })

  await createAuditLog(supabase, user.id, 'VARIANT_CREATED', 'product_variants', created.id, data)
  revalidatePath('/admin/produtos')
  revalidateCatalogPages()

  return { success: true, variant: created }
}

export async function updateVariantAction(
  id: string,
  data: Partial<{
    sku: string
    name: string
    attributes: Record<string, any>
    barcode: string
    min_quantity: number
    multiple_quantity: number
    is_active: boolean
  }>,
) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('product_variants') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao atualizar variante: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'VARIANT_UPDATED', 'product_variants', id, data)
  revalidatePath('/admin/produtos')
  revalidateCatalogPages()

  return { success: true, variant: updated }
}

export async function deactivateVariantAction(id: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('product_variants') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao desativar variante: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'VARIANT_DEACTIVATED', 'product_variants', id, { is_active: false })
  revalidatePath('/admin/produtos')
  revalidateCatalogPages()

  return { success: true, variant: updated }
}

// ==========================================
// 4. IMAGENS DE PRODUTO (Bucket product-images)
// ==========================================

export async function uploadProductImageAction(formData: FormData) {
  const { supabase, user } = await requireAdminSession()

  const productId = formData.get('productId') as string
  const file = formData.get('file') as File
  const altText = (formData.get('altText') as string) || null
  const isPrimary = formData.get('isPrimary') === 'true'

  if (!productId || !file) {
    return { success: false, message: 'Produto e arquivo são obrigatórios.' }
  }

  // 1. Validação server-side estrita de tamanho (máximo 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { success: false, message: 'O arquivo excede o limite máximo permitido de 5 MB.' }
  }

  // 2. Validação server-side estrita de tipo MIME e determinação de extensão real
  let ext = ''
  if (file.type === 'image/jpeg') {
    ext = '.jpg'
  } else if (file.type === 'image/png') {
    ext = '.png'
  } else if (file.type === 'image/webp') {
    ext = '.webp'
  } else {
    return { success: false, message: 'Formato inválido. Apenas JPEG, PNG e WEBP são permitidos.' }
  }

  // 3. Gerar caminho único preservando a extensão validada real
  const timestamp = Date.now()
  const randomHash = Math.random().toString(36).substring(2, 10)
  const filePath = `products/${productId}/${timestamp}-${randomHash}${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload para o bucket product-images (NENHUM uso de company-documents)
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return { success: false, message: `Erro ao enviar imagem: ${uploadError.message}` }
  }

  // Obter URL pública permanente
  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(filePath)

  // Se for primária, desmarcar imagens primárias existentes do produto
  if (isPrimary) {
    await (supabase.from('product_images') as any)
      .update({ is_primary: false })
      .eq('product_id', productId)
  }

  const { data: imageRecord, error: dbError } = await (supabase.from('product_images') as any)
    .insert({
      product_id: productId,
      url: publicUrl,
      alt_text: altText,
      position: 0,
      is_primary: isPrimary,
    })
    .select()
    .single()

  if (dbError) {
    return { success: false, message: `Erro ao registrar imagem no banco: ${dbError.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRODUCT_IMAGE_UPLOADED', 'product_images', imageRecord.id, {
    product_id: productId,
    url: publicUrl,
    is_primary: isPrimary,
  })

  revalidateCatalogPages()
  return { success: true, image: imageRecord }
}

export async function deleteProductImageAction(imageId: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: img } = await (supabase.from('product_images') as any)
    .select('id, product_id, url')
    .eq('id', imageId)
    .maybeSingle()

  if (!img) {
    return { success: false, message: 'Imagem não encontrada.' }
  }

  const { error } = await (supabase.from('product_images') as any)
    .delete()
    .eq('id', imageId)

  if (error) {
    return { success: false, message: `Erro ao remover imagem: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRODUCT_IMAGE_DELETED', 'product_images', imageId, {
    product_id: img.product_id,
    url: img.url,
  })

  revalidateCatalogPages()
  return { success: true }
}

// ==========================================
// 5. ESTOQUE (Invoca RPC Atômica)
// ==========================================

export async function adjustInventoryAction(data: {
  inventory_id: string
  quantity_delta: number
  movement_type: 'adjustment' | 'entry' | 'return' | 'sale'
  reason?: string
  reference_type?: string
  reference_id?: string
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: rpcResult, error } = await supabase.rpc('adjust_inventory_atomic', {
    p_inventory_id: data.inventory_id,
    p_quantity_delta: data.quantity_delta,
    p_movement_type: data.movement_type,
    p_reason: data.reason || 'Ajuste manual administrativo',
    p_reference_type: data.reference_type || undefined,
    p_reference_id: data.reference_id || undefined,
  } as any)

  if (error) {
    return { success: false, message: `Erro no ajuste de estoque: ${error.message}` }
  }

  revalidatePath('/admin/estoque')
  revalidateCatalogPages()

  return { success: true, data: rpcResult }
}

// ==========================================
// 6. TABELAS DE PREÇO & PREÇOS POR VARIANTE
// ==========================================

export async function createPriceTableAction(data: {
  name: string
  description?: string
  is_active?: boolean
  is_default?: boolean
  starts_at?: string
  ends_at?: string
}) {
  const { supabase, user } = await requireAdminSession()

  const { data: created, error } = await (supabase.from('price_tables') as any)
    .insert({
      name: data.name,
      description: data.description || null,
      is_active: data.is_active ?? true,
      is_default: data.is_default ?? false,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao criar tabela de preços: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRICE_TABLE_CREATED', 'price_tables', created.id, data)
  revalidatePath('/admin/tabelas-de-precos')
  revalidateCatalogPages()

  return { success: true, priceTable: created }
}

export async function updatePriceTableAction(
  id: string,
  data: Partial<{
    name: string
    description: string
    is_active: boolean
    is_default: boolean
    starts_at: string
    ends_at: string
  }>,
) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('price_tables') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao atualizar tabela de preços: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRICE_TABLE_UPDATED', 'price_tables', id, data)
  revalidatePath('/admin/tabelas-de-precos')
  revalidateCatalogPages()

  return { success: true, priceTable: updated }
}

export async function deactivatePriceTableAction(id: string) {
  const { supabase, user } = await requireAdminSession()

  const { data: updated, error } = await (supabase.from('price_tables') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: `Erro ao desativar tabela de preços: ${error.message}` }
  }

  await createAuditLog(supabase, user.id, 'PRICE_TABLE_DEACTIVATED', 'price_tables', id, { is_active: false })
  revalidatePath('/admin/tabelas-de-precos')
  revalidateCatalogPages()

  return { success: true, priceTable: updated }
}

export async function upsertPriceTableProductAction(data: {
  price_table_id: string
  product_id: string
  variant_id?: string
  unit_price: number
  promotional_price?: number
  promotion_starts_at?: string
  promotion_ends_at?: string
  min_quantity?: number
  is_active?: boolean
}) {
  const { supabase, user } = await requireAdminSession()

  // Buscar registro existente para aquela combinação de tabela e variante
  let query = (supabase.from('price_table_products') as any)
    .select('id')
    .eq('price_table_id', data.price_table_id)
    .eq('product_id', data.product_id)

  if (data.variant_id) {
    query = query.eq('variant_id', data.variant_id)
  } else {
    query = query.is('variant_id', null)
  }

  const { data: existing } = await query.maybeSingle()

  let result
  if (existing) {
    const { data: updated, error } = await (supabase.from('price_table_products') as any)
      .update({
        unit_price: data.unit_price,
        promotional_price: data.promotional_price || null,
        promotion_starts_at: data.promotion_starts_at || null,
        promotion_ends_at: data.promotion_ends_at || null,
        min_quantity: data.min_quantity ?? 1,
        is_active: data.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return { success: false, message: `Erro ao atualizar preço: ${error.message}` }
    result = updated
  } else {
    const { data: created, error } = await (supabase.from('price_table_products') as any)
      .insert({
        price_table_id: data.price_table_id,
        product_id: data.product_id,
        variant_id: data.variant_id || null,
        unit_price: data.unit_price,
        promotional_price: data.promotional_price || null,
        promotion_starts_at: data.promotion_starts_at || null,
        promotion_ends_at: data.promotion_ends_at || null,
        min_quantity: data.min_quantity ?? 1,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) return { success: false, message: `Erro ao criar preço: ${error.message}` }
    result = created
  }

  await createAuditLog(supabase, user.id, 'PRICE_TABLE_PRODUCT_UPSERTED', 'price_table_products', result.id, data)
  revalidatePath('/admin/tabelas-de-precos')
  revalidateCatalogPages()

  return { success: true, priceTableProduct: result }
}
