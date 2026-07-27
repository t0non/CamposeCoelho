'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { invalidateInventoryCache } from '@/lib/utils/cache'
import { InventoryAdjustmentInputSchema } from '@/lib/validations/admin-catalog'

export async function adjustInventoryAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = InventoryAdjustmentInputSchema.parse(data)

  // Allowlist administrativa rigorosa
  if (parsed.movement_type !== 'adjustment' && parsed.movement_type !== 'return') {
    return { success: false, message: 'Operação não permitida via painel administrativo.' }
  }

  if (parsed.movement_type === 'return' && parsed.quantity_delta <= 0) {
    return { success: false, message: 'Devoluções manuais devem possuir quantidade positiva.' }
  }

  const supabase = (await createClient()) as any

  // Chamar exclusivamente a RPC manual wrapper
  const { data: result, error } = await supabase.rpc('adjust_inventory_manual_atomic', {
    p_inventory_id: parsed.inventory_id,
    p_quantity_delta: parsed.quantity_delta,
    p_movement_type: parsed.movement_type,
    p_reason: parsed.reason,
  })

  if (error) {
    return { success: false, message: error.message || 'Erro ao ajustar estoque.' }
  }

  invalidateInventoryCache()

  return { success: true, new_quantity: result?.new_quantity }
}

export async function getInventoryMovementsAction(inventoryId: string, page = 1, limit = 10) {
  await requireAdmin()
  const { getAdminInventoryMovements } = await import('@/lib/data/admin-catalog')
  try {
    const res = await getAdminInventoryMovements(inventoryId, page, limit)
    return { success: true, data: res.data, count: res.count }
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao carregar movimentações.' }
  }
}
