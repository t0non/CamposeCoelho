import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getProductImageUrl } from '@/lib/utils/storage-url'
import type { CartLineItem, CartSummary } from '@/lib/types/cart'

const EMPTY_SUMMARY: CartSummary = {
  items: [],
  count: 0,
  subtotal: 0,
  hasUnavailable: false,
}

/**
 * Lê o carrinho ativo do usuário autenticado via RPC set-based
 * `get_active_cart_with_prices` e agrega o resumo para o header/minicart.
 *
 * Regras de contexto (aplicadas dentro da própria RPC, SECURITY DEFINER):
 * - anon                → sem carrinho (retorna vazio);
 * - customer pendente/rejeitado → empresa não aprovada → retorna vazio;
 * - customer aprovado   → carrinho da própria empresa (target ignorado);
 * - seller              → exige target_company_id da própria carteira;
 * - admin               → fora do fluxo comercial → retorna vazio.
 *
 * Para o header público, `targetCompanyId` é null: customers resolvem a
 * empresa pelo próprio profile; sellers só terão itens quando um contexto de
 * empresa validado for informado (ver BLOCO 12B).
 *
 * A leitura é sempre set-based — uma única chamada de RPC, nunca uma por item.
 */
export async function readActiveCart(
  targetCompanyId: string | null = null,
): Promise<{ summary: CartSummary; ok: boolean }> {
  const supabase = await createClient()

  // A RPC do 12A ainda não está nos tipos gerados (database.types.ts não foi
  // regerado por falta de introspecção local). O cast é necessário, não
  // cosmético: mantém o type-check verde sem afrouxar validações de negócio.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: CartLineItem[] | null; error: unknown }>)(
    'get_active_cart_with_prices',
    { p_target_company_id: targetCompanyId },
  )

  if (error) {
    // Nunca propagar detalhe técnico (SQL/stack) para a UI.
    console.error('[readActiveCart] RPC error')
    return { summary: EMPTY_SUMMARY, ok: false }
  }

  // A RPC devolve image_url como caminho relativo do Storage. Resolvemos aqui
  // para URL pública (mantendo null quando ausente, para o placeholder na UI).
  const items = (data ?? []).map((item) => ({
    ...item,
    image_url: item.image_url ? getProductImageUrl(item.image_url) : null,
  }))
  const count = items.reduce((acc, item) => acc + (item.quantity ?? 0), 0)
  const subtotal = items.reduce((acc, item) => acc + (item.line_total ?? 0), 0)
  const hasUnavailable = items.some((item) => !item.is_available)

  return { summary: { items, count, subtotal, hasUnavailable }, ok: true }
}

/**
 * Conveniência para consumidores que só precisam do resumo (ex.: header).
 * Em caso de falha de leitura, devolve o resumo vazio.
 */
export async function getActiveCartSummary(
  targetCompanyId: string | null = null,
): Promise<CartSummary> {
  const { summary } = await readActiveCart(targetCompanyId)
  return summary
}
