'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import { createAuditLog } from '@/lib/utils/audit'
import { invalidateProductCache } from '@/lib/utils/cache'
import { ImageAltTextInputSchema } from '@/lib/validations/admin-products'

export async function updateImageAltTextAction(data: any) {
  const { user } = await requireAdmin()
  const parsed = ImageAltTextInputSchema.parse(data)
  const supabase = (await createClient()) as any

  // Confirmar que imagem pertence ao produto e é válida
  const { data: existing } = await supabase.from('product_images').select('id').eq('id', parsed.image_id).eq('product_id', parsed.product_id).maybeSingle()
  if (!existing) return { success: false, message: 'Imagem não encontrada ou não pertence ao produto.' }

  const { error } = await supabase.from('product_images').update({ alt_text: parsed.alt_text }).eq('id', parsed.image_id)
  if (error) return { success: false, message: 'Erro ao atualizar o Alt Text.' }

  await createAuditLog('PRODUCT_IMAGE_ALT_UPDATED', 'product_images', parsed.image_id, parsed)
  invalidateProductCache()
  return { success: true }
}

export async function setPrimaryImageAction(productId: string, imageId: string) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { data, error } = await supabase.rpc('set_primary_image', {
    p_image_id: imageId,
    p_product_id: productId
  })

  if (error) return { success: false, message: error.message }
  invalidateProductCache()
  return { success: true }
}

export async function reorderProductImagesAction(productId: string, imageIds: string[]) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  const { data, error } = await supabase.rpc('reorder_images', {
    p_product_id: productId,
    p_image_ids: imageIds
  })

  if (error) return { success: false, message: error.message }
  invalidateProductCache()
  return { success: true }
}

export async function removeProductImageAction(productId: string, imageId: string) {
  const { user } = await requireAdmin()
  const supabase = (await createClient()) as any

  // RPC transacional para remover a referência do banco e retornar o caminho da imagem
  const { data: result, error } = await supabase.rpc('remove_product_image', {
    p_image_id: imageId,
    p_product_id: productId
  })

  if (error) return { success: false, message: error.message }

  // Remover do Storage
  if (result && result.url) {
    const { error: storageError } = await supabase.storage.from('product-images').remove([result.url])
    if (storageError) {
      console.error(`Falha ao remover arquivo órfão do Storage: ${result.url}`, storageError)
      await supabase.rpc('register_storage_cleanup_task', {
        p_bucket_id: 'product-images',
        p_object_path: result.url,
        p_operation: 'delete',
        p_source_table: 'product_images',
        p_source_id: imageId,
        p_last_error: storageError.message
      })
    }
  }

  invalidateProductCache()
  return { success: true }
}
