'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { invalidatePricingCache } from '@/lib/utils/cache'
import { parseBrazilianMoney } from '@/lib/utils/money-parser'
import { PriceTableInputSchema, PriceTableBaseSchema, PriceEntryInputSchema } from '@/lib/validations/admin-catalog'

export async function createPriceTableAction(data: any) {
  await requireAdmin()
  const parsed = PriceTableInputSchema.parse(data)
  const supabase = (await createClient()) as any

  const { data: result, error } = await supabase.rpc('create_price_table_atomic', {
    p_name: parsed.name,
    p_description: parsed.description || null,
    p_starts_at: parsed.starts_at || null,
    p_ends_at: parsed.ends_at || null,
  })

  if (error) return { success: false, message: error.message }
  if (result?.no_op) return { success: true, no_op: true }

  invalidatePricingCache()
  return { success: true, id: result?.id }
}

export async function updatePriceTableAction(id: string, data: any) {
  await requireAdmin()
  const parsed = PriceTableBaseSchema.partial().parse(data)
  const supabase = (await createClient()) as any

  const { data: result, error } = await supabase.rpc('update_price_table_atomic', {
    p_id: id,
    p_name: parsed.name,
    p_description: parsed.description || null,
    p_starts_at: parsed.starts_at || null,
    p_ends_at: parsed.ends_at || null,
  })

  if (error) return { success: false, message: error.message }
  if (result?.no_op) return { success: true, no_op: true }

  invalidatePricingCache()
  return { success: true }
}

export async function togglePriceTableStatusAction(id: string, isActive: boolean) {
  await requireAdmin()
  const supabase = (await createClient()) as any

  const { data: result, error } = await supabase.rpc('set_price_table_status_atomic', {
    p_id: id,
    p_is_active: isActive,
  })

  if (error) return { success: false, message: error.message }
  if (result?.no_op) return { success: true, no_op: true }

  invalidatePricingCache()
  return { success: true }
}

export async function upsertPriceEntryAction(data: any) {
  await requireAdmin()

  // 1. Processar e normalizar strings de entrada monetária pt-BR
  const inputData = { ...data }
  if (typeof inputData.unit_price === 'string') {
    inputData.unit_price = parseBrazilianMoney(inputData.unit_price)
  }
  if (typeof inputData.promotional_price === 'string' && inputData.promotional_price.trim() !== '') {
    inputData.promotional_price = parseBrazilianMoney(inputData.promotional_price)
  } else if (!inputData.promotional_price) {
    inputData.promotional_price = null
  }

  const parsed = PriceEntryInputSchema.parse(inputData)
  const supabase = (await createClient()) as any

  const { data: result, error } = await supabase.rpc('upsert_price_entry_atomic', {
    p_price_table_id: parsed.price_table_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id || null,
    p_min_quantity: parsed.min_quantity,
    p_unit_price: parsed.unit_price,
    p_promotional_price: parsed.promotional_price || null,
    p_promotion_starts_at: parsed.promotion_starts_at || null,
    p_promotion_ends_at: parsed.promotion_ends_at || null,
  })

  if (error) return { success: false, message: error.message }
  if (result?.no_op) return { success: true, id: result.id, no_op: true }

  invalidatePricingCache()
  return { success: true, id: result?.id }
}

export async function togglePriceEntryStatusAction(id: string, isActive: boolean) {
  await requireAdmin()
  const supabase = (await createClient()) as any

  const { data: result, error } = await supabase.rpc('set_price_entry_status_atomic', {
    p_id: id,
    p_is_active: isActive,
  })

  if (error) return { success: false, message: error.message }
  if (result?.no_op) return { success: true, no_op: true }

  invalidatePricingCache()
  return { success: true }
}
