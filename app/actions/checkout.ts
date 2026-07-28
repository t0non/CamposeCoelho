'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CheckoutSchema } from '@/lib/validations/checkout'

// Mapeia códigos de erro da RPC para mensagens humanas sem SQL
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Você precisa estar logado para finalizar o pedido.',
  IDEMPOTENCY_KEY_REQUIRED: 'Erro inesperado. Atualize a página e tente novamente.',
  IDEMPOTENCY_KEY_CONFLICT: 'Não foi possível confirmar este pedido agora. Atualize a página e tente novamente.',
  ADDRESS_REQUIRED: 'Selecione um endereço de entrega.',
  ADDRESS_NOT_FOUND: 'Endereço não encontrado ou não pertence à sua conta.',
  FORBIDDEN: 'Acesso não autorizado.',
  COMPANY_NOT_ELIGIBLE: 'Sua empresa não está habilitada para compras.',
  TARGET_COMPANY_REQUIRED: 'Empresa-alvo é obrigatória para vendedores.',
  SELLER_CHECKOUT_NOT_SUPPORTED: 'Checkout por vendedor ainda não está disponível.',
  EMPTY_CART: 'Seu carrinho está vazio ou já foi finalizado.',
  PRODUCT_UNAVAILABLE: 'Um dos produtos do seu pedido não está mais disponível.',
  VARIANT_INVALID: 'Uma das variantes do seu pedido não está mais disponível.',
  BELOW_MIN_QUANTITY: 'A quantidade de um item ficou abaixo do mínimo permitido.',
  INVALID_MULTIPLE: 'A quantidade de um item não respeita mais o múltiplo de embalagem.',
  NO_PRICE_AVAILABLE: 'O preço de um item não está mais disponível.',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para um dos itens do pedido.',
}

function mapError(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Não foi possível finalizar o pedido. Tente novamente.'
}

export async function checkoutAction(data: unknown) {
  const parsed = CheckoutSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos.' }
  }

  const { idempotency_key, shipping_address_id } = parsed.data
  const supabase = await createClient()

  const { data: result, error } = await (supabase.rpc as any)('checkout_atomic', {
    p_idempotency_key: idempotency_key,
    p_shipping_address_id: shipping_address_id,
  })

  if (error) {
    console.error('[checkoutAction] RPC error:', error.code)
    return { success: false, message: 'Erro ao finalizar o pedido.' }
  }

  const r = result as any
  if (!r?.success) {
    return { success: false, message: mapError(r?.code ?? '') }
  }

  // Carrinho foi convertido pela RPC — invalidar as leituras que dependem dele.
  revalidatePath('/carrinho')

  return { success: true, order_id: r.order_id, order_number: r.order_number }
}
