'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  AddToCartSchema,
  UpdateCartItemSchema,
  RemoveCartItemSchema,
  ClearCartSchema,
} from '@/lib/validations/cart'

// Mapeia códigos de erro da RPC para mensagens humanas sem SQL
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Você precisa estar logado para usar o carrinho.',
  FORBIDDEN: 'Acesso não autorizado.',
  COMPANY_NOT_ELIGIBLE: 'Sua empresa não está habilitada para compras.',
  TARGET_COMPANY_REQUIRED: 'Empresa-alvo é obrigatória para vendedores.',
  PRODUCT_NOT_FOUND: 'Produto não encontrado.',
  PRODUCT_INACTIVE: 'Produto indisponível.',
  PRODUCT_NOT_PUBLISHED: 'Produto não está disponível para venda.',
  VARIANT_NOT_FOUND: 'Variante não encontrada.',
  VARIANT_INACTIVE: 'Variante indisponível.',
  VARIANT_WRONG_PRODUCT: 'Variante inválida para este produto.',
  PRODUCT_UNAVAILABLE: 'Produto ou variante indisponível.',
  NO_PRICE_AVAILABLE: 'Preço não disponível para a quantidade informada.',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para a quantidade solicitada.',
  BELOW_MIN_QUANTITY: 'Quantidade abaixo do mínimo exigido.',
  INVALID_MULTIPLE: 'Quantidade deve ser um múltiplo do embalamento.',
  QUANTITY_OVERFLOW: 'Quantidade excede o limite máximo permitido.',
  INVALID_QUANTITY: 'Quantidade inválida.',
}

function mapError(code: string, extra?: Record<string, unknown>): string {
  const base = ERROR_MESSAGES[code] ?? 'Erro inesperado. Tente novamente.'
  if (code === 'BELOW_MIN_QUANTITY' && extra?.min_quantity) {
    return `Quantidade mínima para este produto é ${extra.min_quantity} unidades.`
  }
  if (code === 'INVALID_MULTIPLE' && extra?.multiple_quantity) {
    return `Quantidade deve ser múltiplo de ${extra.multiple_quantity}.`
  }
  if (code === 'INSUFFICIENT_STOCK' && extra?.available !== undefined) {
    return `Estoque disponível: ${extra.available} unidades.`
  }
  return base
}

export async function addToCartAction(data: unknown) {
  const parsed = AddToCartSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos.' }
  }

  const { product_id, variant_id, quantity, target_company_id } = parsed.data
  const supabase = await createClient()

  const { data: result, error } = await (supabase.rpc as any)('add_to_cart_atomic', {
    p_product_id: product_id,
    p_variant_id: variant_id ?? null,
    p_quantity: quantity,
    p_target_company_id: target_company_id ?? null,
  })

  if (error) {
    console.error('[addToCartAction] RPC error:', error.code)
    return { success: false, message: 'Erro ao adicionar ao carrinho.' }
  }

  const r = result as any
  if (!r?.success) {
    return { success: false, message: mapError(r?.code ?? '', r) }
  }

  revalidatePath('/carrinho')
  return { success: true, message: 'Item adicionado ao carrinho.' }
}

export async function updateCartItemQuantityAction(data: unknown) {
  const parsed = UpdateCartItemSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos.' }
  }

  const { item_id, quantity } = parsed.data
  const supabase = await createClient()

  const { data: result, error } = await (supabase.rpc as any)('update_cart_item_atomic', {
    p_item_id: item_id,
    p_quantity: quantity,
  })

  if (error) {
    console.error('[updateCartItemQuantityAction] RPC error:', error.code)
    return { success: false, message: 'Erro ao atualizar carrinho.' }
  }

  const r = result as any
  if (!r?.success) {
    return { success: false, message: mapError(r?.code ?? '', r) }
  }

  // No-op: não revalida
  if (r?.changed === false) {
    return { success: true, noOp: true }
  }

  revalidatePath('/carrinho')
  return { success: true }
}

export async function removeCartItemAction(data: unknown) {
  const parsed = RemoveCartItemSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos.' }
  }

  const { item_id } = parsed.data
  const supabase = await createClient()

  const { data: result, error } = await (supabase.rpc as any)('remove_cart_item_atomic', {
    p_item_id: item_id,
  })

  if (error) {
    console.error('[removeCartItemAction] RPC error:', error.code)
    return { success: false, message: 'Erro ao remover item.' }
  }

  const r = result as any
  // No-op silencioso
  if (!r?.changed) {
    return { success: true, noOp: true }
  }

  revalidatePath('/carrinho')
  return { success: true }
}

export async function clearCartAction(data?: unknown) {
  const parsed = ClearCartSchema.safeParse(data ?? {})
  if (!parsed.success) {
    return { success: false, message: 'Dados inválidos.' }
  }

  const { target_company_id } = parsed.data
  const supabase = await createClient()

  const { data: result, error } = await (supabase.rpc as any)('clear_cart_atomic', {
    p_target_company_id: target_company_id ?? null,
  })

  if (error) {
    console.error('[clearCartAction] RPC error:', error.code)
    return { success: false, message: 'Erro ao limpar carrinho.' }
  }

  const r = result as any
  if (!r?.changed) {
    return { success: true, noOp: true }
  }

  revalidatePath('/carrinho')
  return { success: true }
}
