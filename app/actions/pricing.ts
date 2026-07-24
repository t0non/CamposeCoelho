'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { createAuditLog } from '@/lib/utils/audit'
import { invalidatePricingCache } from '@/lib/utils/cache'
import { PriceTableInputSchema, PriceTableBaseSchema, PriceEntryInputSchema } from '@/lib/validations/admin-catalog'

export async function createPriceTableAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = PriceTableInputSchema.parse(data)
  const supabase = (await createClient()) as any

  const { data: created, error } = await supabase
    .from('price_tables')
    .insert(parsed as any)
    .select('id')
    .single()

  if (error) return { success: false, message: error.message }

  await createAuditLog('PRICE_TABLE_CREATED', 'price_tables', created.id, parsed)
  invalidatePricingCache()
  return { success: true, id: created.id }
}

export async function updatePriceTableAction(id: string, data: any) {
  const { user } = await requireAdmin()
  const parsed = PriceTableBaseSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('price_tables').update(parsed as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('PRICE_TABLE_UPDATED', 'price_tables', id, parsed)
  invalidatePricingCache()
  return { success: true }
}

export async function togglePriceTableStatusAction(id: string, isActive: boolean) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('price_tables').update({ is_active: isActive } as any).eq('id', id)
  if (error) return { success: false, message: error.message }

  await createAuditLog('PRICE_TABLE_DEACTIVATED', 'price_tables', id, { is_active: isActive })
  invalidatePricingCache()
  return { success: true }
}

export async function upsertPriceEntryAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = PriceEntryInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // Buscar entrada existente para ver se é insert ou update
  const { data: existing } = await supabase
    .from('price_table_products')
    .select('id')
    .eq('price_table_id', parsed.price_table_id)
    .eq('product_id', parsed.product_id)
    .eq('variant_id', parsed.variant_id || null)
    .maybeSingle()

  let resultId = null
  if (existing) {
    const { data: updated, error } = await supabase
      .from('price_table_products')
      .update(parsed as any)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) return { success: false, message: error.message }
    resultId = updated.id
  } else {
    const { data: inserted, error } = await supabase
      .from('price_table_products')
      .insert(parsed as any)
      .select('id')
      .single()
    if (error) return { success: false, message: error.message }
    resultId = inserted.id
  }

  await createAuditLog('PRICE_TABLE_PRODUCT_UPSERTED', 'price_table_products', resultId, parsed)
  invalidatePricingCache()
  return { success: true, id: resultId }
}
