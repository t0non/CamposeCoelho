'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FavoriteActionResult {
  success: boolean
  message: string
  isFavorite?: boolean
}

/**
 * Adiciona um produto aos favoritos da sessão atual.
 * Nunca aceita profile_id do frontend — obtém obrigatoriamente do auth server.
 */
export async function addFavoriteAction(productId: string): Promise<FavoriteActionResult> {
  if (!productId) return { success: false, message: 'ID do produto é obrigatório.' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Usuário não autenticado. Faça login para favoritar.' }
  }

  // Confirmar que o produto existe, está ativo e publicado
  const { data: prodCheck } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('is_active', true)
    .eq('is_published', true)
    .maybeSingle()

  if (!prodCheck) {
    return { success: false, message: 'Produto não encontrado ou indisponível.' }
  }

  // Inserir favorito para a sessão atual (profile_id = user.id)
  const { error } = await (supabase.from('favorites') as any).insert({
    profile_id: user.id,
    product_id: productId,
  })

  if (error) {
    if (error.code === '23505') {
      // Duplicado (já é favorito)
      return { success: true, message: 'Produto já está em seus favoritos.', isFavorite: true }
    }
    console.error('Erro ao adicionar favorito:', error.message)
    return { success: false, message: 'Erro ao salvar favorito.' }
  }

  revalidatePath('/minha-conta/favoritos')
  return { success: true, message: 'Produto adicionado aos favoritos!', isFavorite: true }
}

/**
 * Remove um produto dos favoritos da sessão atual.
 */
export async function removeFavoriteAction(productId: string): Promise<FavoriteActionResult> {
  if (!productId) return { success: false, message: 'ID do produto é obrigatório.' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' }
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('profile_id', user.id)
    .eq('product_id', productId)

  if (error) {
    console.error('Erro ao remover favorito:', error.message)
    return { success: false, message: 'Erro ao remover favorito.' }
  }

  revalidatePath('/minha-conta/favoritos')
  return { success: true, message: 'Produto removido dos favoritos.', isFavorite: false }
}

/**
 * Obtém a lista de favoritos do usuário logado.
 */
export async function getUserFavoritesAction() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: favs } = await supabase
    .from('favorites')
    .select(
      `
      id,
      created_at,
      product_id,
      products (
        id,
        sku,
        name,
        slug,
        unit,
        min_quantity,
        is_active,
        is_published,
        product_images (url, is_primary, position)
      )
      `,
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  return favs ?? []
}
