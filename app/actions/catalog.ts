'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { createAuditLog } from '@/lib/utils/audit'
import { invalidateCategoryCache, invalidateBrandCache, invalidateProductCache } from '@/lib/utils/cache'
import { CategoryInputSchema, BrandInputSchema, ProductInputSchema, ProductVariantInputSchema } from '@/lib/validations/admin-catalog'

// CATEGORIAS
export async function createCategoryAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = CategoryInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // Checagem proativa amigável
  const { data: existing } = await supabase.from('categories').select('id').eq('slug', parsed.slug).maybeSingle()
  if (existing) return { success: false, message: 'Este slug já está em uso por outra categoria.' }

  const { data: created, error } = await supabase
    .from('categories')
    .insert(parsed as any)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este slug já está em uso por outra categoria.' }
    return { success: false, message: 'Erro ao criar a categoria.' }
  }

  await createAuditLog('CATEGORY_CREATED', 'categories', created.id, parsed)
  invalidateCategoryCache(parsed.slug)

  return { success: true, id: created.id }
}

export async function updateCategoryAction(id: string, data: any) {
  const { user } = await requireAdmin()
  const parsed = CategoryInputSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  if (parsed.slug) {
    const { data: existing } = await supabase.from('categories').select('id').eq('slug', parsed.slug).neq('id', id).maybeSingle()
    if (existing) return { success: false, message: 'Este slug já está em uso por outra categoria.' }
  }

  // Se trocar slug, invalidar antigo
  const { data: oldCategory } = await supabase.from('categories').select('slug').eq('id', id).single()

  const { error } = await supabase.from('categories').update(parsed as any).eq('id', id)
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este slug já está em uso por outra categoria.' }
    return { success: false, message: 'Erro ao atualizar a categoria.' }
  }

  await createAuditLog('CATEGORY_UPDATED', 'categories', id, parsed)
  if (oldCategory?.slug && oldCategory.slug !== parsed.slug) {
    invalidateCategoryCache(oldCategory.slug)
  }
  if (parsed.slug) {
    invalidateCategoryCache(parsed.slug)
  } else {
    invalidateCategoryCache() // Caso não altere slug, ao menos revalida a listagem geral
  }

  return { success: true }
}

export async function toggleCategoryStatusAction(id: string, isActive: boolean) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('categories').update({ is_active: isActive } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('CATEGORY_DEACTIVATED', 'categories', id, { is_active: isActive })
  invalidateCategoryCache()

  return { success: true }
}

// MARCAS
export async function createBrandAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = BrandInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // Checagem proativa amigável
  const { data: existing } = await supabase.from('brands').select('id').eq('slug', parsed.slug).maybeSingle()
  if (existing) return { success: false, message: 'Este slug já está em uso por outra marca.' }

  const { data: created, error } = await supabase.from('brands').insert(parsed as any).select('id').single()
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este slug já está em uso por outra marca.' }
    return { success: false, message: 'Erro ao criar a marca.' }
  }

  await createAuditLog('BRAND_CREATED', 'brands', created.id, parsed)
  invalidateBrandCache(parsed.slug)
  return { success: true, id: created.id }
}

export async function updateBrandAction(id: string, data: any) {
  const { user } = await requireAdmin()
  const parsed = BrandInputSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  if (parsed.slug) {
    const { data: existing } = await supabase.from('brands').select('id').eq('slug', parsed.slug).neq('id', id).maybeSingle()
    if (existing) return { success: false, message: 'Este slug já está em uso por outra marca.' }
  }

  const { data: oldBrand } = await supabase.from('brands').select('slug').eq('id', id).single()

  const { error } = await supabase.from('brands').update(parsed as any).eq('id', id)
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este slug já está em uso por outra marca.' }
    return { success: false, message: 'Erro ao atualizar a marca.' }
  }

  await createAuditLog('BRAND_UPDATED', 'brands', id, parsed)
  if (oldBrand?.slug && oldBrand.slug !== parsed.slug) {
    invalidateBrandCache(oldBrand.slug)
  }
  if (parsed.slug) {
    invalidateBrandCache(parsed.slug)
  } else {
    invalidateBrandCache()
  }

  return { success: true }
}

export async function toggleBrandStatusAction(id: string, isActive: boolean) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('brands').update({ is_active: isActive } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('BRAND_DEACTIVATED', 'brands', id, { is_active: isActive })
  invalidateBrandCache()
  return { success: true }
}

// PRODUTOS
export async function createProductAction(data: any) {
  const { user } = await requireAdmin()
  const { ProductInputSchema } = await import('@/lib/validations/admin-products')
  const parsed = ProductInputSchema.parse(data)
  // Forçar rascunho
  parsed.is_published = false
  const supabase = (await createClient()) as any

  const { data: existingSlug } = await supabase.from('products').select('id').eq('slug', parsed.slug).maybeSingle()
  if (existingSlug) return { success: false, message: 'Este slug já está em uso por outro produto.' }
  
  const { data: existingSku } = await supabase.from('products').select('id').eq('sku', parsed.sku).maybeSingle()
  if (existingSku) return { success: false, message: 'Este SKU já está em uso por outro produto.' }

  const { data: created, error } = await supabase.from('products').insert(parsed as any).select('id').single()
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Slug ou SKU já em uso (violou restrição única).' }
    return { success: false, message: 'Erro ao criar o produto.' }
  }

  await createAuditLog('PRODUCT_CREATED', 'products', created.id, parsed)
  invalidateProductCache(parsed.slug)
  return { success: true, id: created.id }
}

export async function updateProductAction(id: string, data: any) {
  const { user } = await requireAdmin()
  const { ProductInputSchema } = await import('@/lib/validations/admin-products')
  const parsed = ProductInputSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  if (parsed.slug) {
    const { data: existingSlug } = await supabase.from('products').select('id').eq('slug', parsed.slug).neq('id', id).maybeSingle()
    if (existingSlug) return { success: false, message: 'Este slug já está em uso por outro produto.' }
  }
  if (parsed.sku) {
    const { data: existingSku } = await supabase.from('products').select('id').eq('sku', parsed.sku).neq('id', id).maybeSingle()
    if (existingSku) return { success: false, message: 'Este SKU já está em uso por outro produto.' }
  }

  const { data: oldProduct } = await supabase.from('products').select('slug').eq('id', id).single()

  const { error } = await supabase.from('products').update(parsed as any).eq('id', id)
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Slug ou SKU já em uso (violou restrição única).' }
    return { success: false, message: 'Erro ao atualizar o produto.' }
  }

  await createAuditLog('PRODUCT_UPDATED', 'products', id, parsed)
  if (oldProduct?.slug && oldProduct.slug !== parsed.slug) {
    invalidateProductCache(oldProduct.slug)
  }
  if (parsed.slug) {
    invalidateProductCache(parsed.slug)
  } else {
    invalidateProductCache()
  }

  return { success: true }
}

export async function publishProductAction(id: string) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  // Validar se o produto está ativo e possui nome válido (regra de negócio confirmada)
  const { data: product } = await supabase.from('products').select('is_active, name').eq('id', id).single()
  if (!product || !product.is_active) {
    return { success: false, message: 'O produto precisa estar ativo para ser publicado.' }
  }

  const { error } = await supabase.from('products').update({ is_published: true } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('PRODUCT_PUBLISHED', 'products', id, { is_published: true })
  invalidateProductCache()
  return { success: true }
}

export async function unpublishProductAction(id: string) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('products').update({ is_published: false } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('PRODUCT_UNPUBLISHED', 'products', id, { is_published: false })
  invalidateProductCache()
  return { success: true }
}

export async function toggleProductStatusAction(id: string, isActive: boolean) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('products').update({ is_active: isActive } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  const actionName = isActive ? 'PRODUCT_REACTIVATED' : 'PRODUCT_DEACTIVATED'
  await createAuditLog(actionName, 'products', id, { is_active: isActive })
  invalidateProductCache()
  return { success: true }
}

// VARIANTES
export async function createVariantAction(data: any) {
  const { user } = await requireAdmin()
  const { VariantInputSchema } = await import('@/lib/validations/admin-products')
  const parsed = VariantInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // Checagem proativa
  const { data: existingSku } = await supabase.from('product_variants').select('id').eq('sku', parsed.sku).maybeSingle()
  if (existingSku) return { success: false, message: 'Este SKU já está em uso por outra variante.' }

  const { data: created, error } = await supabase.from('product_variants').insert(parsed as any).select('id').single()
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este SKU já está em uso (violou restrição única).' }
    return { success: false, message: 'Erro ao criar a variante.' }
  }

  await createAuditLog('VARIANT_CREATED', 'product_variants', created.id, parsed)
  invalidateProductCache()
  return { success: true, id: created.id }
}

export async function updateVariantAction(id: string, data: any) {
  const { user } = await requireAdmin()
  const { VariantInputSchema } = await import('@/lib/validations/admin-products')
  const parsed = VariantInputSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  if (parsed.sku) {
    const { data: existingSku } = await supabase.from('product_variants').select('id').eq('sku', parsed.sku).neq('id', id).maybeSingle()
    if (existingSku) return { success: false, message: 'Este SKU já está em uso por outra variante.' }
  }

  // Prevenir edição cruzada confirmando se product_id bate
  const { data: existingVariant } = await supabase.from('product_variants').select('product_id').eq('id', id).single()
  if (!existingVariant) return { success: false, message: 'Variante não encontrada.' }
  if (parsed.product_id && parsed.product_id !== existingVariant.product_id) {
    return { success: false, message: 'Não é possível alterar o produto da variante (Edição cruzada bloqueada).' }
  }
  // remover product_id do update seguro
  delete parsed.product_id

  const { error } = await supabase.from('product_variants').update(parsed as any).eq('id', id)
  if (error) {
    if (error.code === '23505') return { success: false, message: 'Este SKU já está em uso (violou restrição única).' }
    return { success: false, message: 'Erro ao atualizar a variante.' }
  }

  await createAuditLog('VARIANT_UPDATED', 'product_variants', id, parsed)
  invalidateProductCache()
  return { success: true }
}

export async function toggleVariantStatusAction(id: string, isActive: boolean) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('product_variants').update({ is_active: isActive } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  const actionName = isActive ? 'VARIANT_REACTIVATED' : 'VARIANT_DEACTIVATED'
  await createAuditLog(actionName, 'product_variants', id, { is_active: isActive })
  invalidateProductCache()
  return { success: true }
}
