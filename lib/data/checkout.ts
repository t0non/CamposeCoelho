import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CheckoutAddress } from '@/lib/types/checkout'

/**
 * Lista os endereços do próprio cliente PARA A EMPRESA do checkout atual
 * (RLS: profile_id = auth.uid(); filtro explícito por company_id evita
 * pré-selecionar um endereço de outra empresa — a RPC checkout_atomic
 * exige a mesma correspondência profile_id + company_id).
 * Não há CRUD de endereços neste bloco — apenas leitura dos já cadastrados
 * (criados no onboarding da empresa).
 */
export async function getCheckoutAddresses(companyId: string): Promise<CheckoutAddress[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('addresses')
    .select('id, label, zip_code, street, number, complement, neighborhood, city, state, is_default')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as unknown as CheckoutAddress[]
}
