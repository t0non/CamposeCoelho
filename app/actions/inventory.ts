'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { invalidateInventoryCache } from '@/lib/utils/cache'
import { InventoryAdjustmentInputSchema } from '@/lib/validations/admin-catalog'

export async function adjustInventoryAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = InventoryAdjustmentInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // A RPC adjust_inventory_atomic já cuida da validação de regras de negócio, 
  // das atualizações atômicas e também da gravação do audit_log de forma segura.
  const { data: result, error } = await supabase.rpc('adjust_inventory_atomic', {
    p_inventory_id: parsed.inventory_id,
    p_quantity_delta: parsed.quantity_delta,
    p_movement_type: parsed.movement_type,
    p_reason: parsed.reason,
    p_reference_type: parsed.reference_type || undefined,
    p_reference_id: parsed.reference_id || undefined,
  } as any)

  if (error) {
    // Evitar retornar o erro SQL bruto, retornar mensagem genérica ou tratada
    return { success: false, message: 'Não foi possível ajustar o estoque. Verifique se o delta e regras de negócio são válidos.' }
  }

  // Se precisar invalidar o cache de um produto específico, 
  // precisaríamos do productSlug. Para manter genérico, limpamos o admin-estoque.
  invalidateInventoryCache()

  return { success: true, new_quantity: result?.new_quantity }
}
