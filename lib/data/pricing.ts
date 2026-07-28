import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { PriceInfo } from '@/types/product.types'

export interface CustomerSessionPricing {
  priceTableId: string | null
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

/**
 * Resolve com segurança a identidade e permissão de preço do cliente atual via servidor.
 * Retorna se o cliente pode ver preços e o id da tabela de preços da empresa vinculada.
 */
export async function getCustomerSessionPricing(): Promise<CustomerSessionPricing> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { priceTableId: null, canViewPrices: false, userStatus: 'visitor' }
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as { role: string; company_id: string | null } | null

  if (!profile || profile.role !== 'customer' || !profile.company_id) {
    return { priceTableId: null, canViewPrices: false, userStatus: 'visitor' }
  }

  const { data: companyData } = await supabase
    .from('companies')
    .select('status, price_table_id')
    .eq('id', profile.company_id)
    .maybeSingle()

  const company = companyData as { status: string; price_table_id: string | null } | null

  if (!company || company.status !== 'approved' || !company.price_table_id) {
    const status = (company?.status as CustomerSessionPricing['userStatus']) ?? 'pending'
    return { priceTableId: null, canViewPrices: false, userStatus: status }
  }

  return {
    priceTableId: company.price_table_id,
    canViewPrices: true,
    userStatus: 'approved',
  }
}

/**
 * Calcula se a promoção está dentro do período válido.
 */
export function isPromotionValid(
  promotionalPrice: number | null | undefined,
  unitPrice: number,
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): boolean {
  if (promotionalPrice === null || promotionalPrice === undefined) return false
  if (promotionalPrice < 0 || promotionalPrice > unitPrice) return false

  const now = new Date()
  if (startsAt && new Date(startsAt) > now) return false
  if (endsAt && new Date(endsAt) < now) return false

  return true
}

/**
 * Helper Server-Only: Obtém preço efetivo para uma única variante para a sessão atual.
 * Não aceita companyId ou priceTableId do frontend.
 */
export async function getEffectivePriceForCurrentCustomer(
  variantId: string,
): Promise<PriceInfo | undefined> {
  if (!variantId) return undefined

  const sessionInfo = await getCustomerSessionPricing()
  if (!sessionInfo.canViewPrices || !sessionInfo.priceTableId) {
    return undefined
  }

  const supabase = await createClient()

  // Consulta RPC oficial get_effective_price_for_session
  const { data: priceResult } = (await (supabase.rpc as any)('get_effective_price_for_session', {
    p_variant_id: variantId,
  })) as {
    data: Array<{ unit_price: number; promotional_price: number | null; effective_price: number; is_on_promotion: boolean }> | null
  }

  if (priceResult && priceResult.length > 0) {
    const row = priceResult[0]
    return {
      unit_price: row.unit_price,
      promotional_price: row.promotional_price,
      effective_price: row.effective_price,
      is_on_promotion: row.is_on_promotion,
    }
  }

  return undefined
}

/**
 * Helper Server-Only: preço a nível de PRODUTO (variant_id NULL), para
 * produtos sem nenhuma variante ativa. Usa consulta direta restrita ao
 * price_table_id da sessão do próprio cliente (mesmo padrão de
 * getCatalogPricingForCurrentCustomer) — não aceita companyId/priceTableId
 * do frontend.
 */
export async function getEffectiveProductLevelPriceForCurrentCustomer(
  productId: string,
): Promise<PriceInfo | undefined> {
  if (!productId) return undefined

  const sessionInfo = await getCustomerSessionPricing()
  if (!sessionInfo.canViewPrices || !sessionInfo.priceTableId) return undefined

  const supabase = await createClient()

  const { data } = await supabase
    .from('price_table_products')
    .select(
      `
      unit_price,
      promotional_price,
      promotion_starts_at,
      promotion_ends_at,
      is_active,
      price_tables (is_active, starts_at, ends_at)
      `,
    )
    .eq('price_table_id', sessionInfo.priceTableId)
    .eq('product_id', productId)
    .is('variant_id', null)
    .eq('is_active', true)
    .order('min_quantity', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return undefined

  const item = data as unknown as {
    unit_price: number
    promotional_price: number | null
    promotion_starts_at: string | null
    promotion_ends_at: string | null
    price_tables: { is_active: boolean; starts_at: string | null; ends_at: string | null } | null
  }

  if (!item.price_tables || !item.price_tables.is_active) return undefined
  const now = new Date()
  if (item.price_tables.starts_at && new Date(item.price_tables.starts_at) > now) return undefined
  if (item.price_tables.ends_at && new Date(item.price_tables.ends_at) < now) return undefined

  const hasValidPromo = isPromotionValid(
    item.promotional_price,
    item.unit_price,
    item.promotion_starts_at,
    item.promotion_ends_at,
  )
  const effective_price = hasValidPromo ? (item.promotional_price as number) : item.unit_price

  return {
    unit_price: Number(item.unit_price),
    promotional_price: hasValidPromo ? Number(item.promotional_price) : null,
    effective_price: Number(effective_price),
    is_on_promotion: hasValidPromo,
  }
}

/**
 * Helper Server-Only: Resolução em LOTE de preços para catálogo e busca.
 * Evita chamadas N+1 ao banco.
 */
export async function getCatalogPricingForCurrentCustomer(
  variantIds: string[],
): Promise<Map<string, PriceInfo>> {
  const priceMap = new Map<string, PriceInfo>()
  if (!variantIds || variantIds.length === 0) return priceMap

  const sessionInfo = await getCustomerSessionPricing()
  if (!sessionInfo.canViewPrices || !sessionInfo.priceTableId) {
    return priceMap
  }

  const supabase = await createClient()

  // Buscar todos os preços em lote para a tabela da empresa logada
  const { data: rawPrices } = await supabase
    .from('price_table_products')
    .select(
      `
      variant_id,
      unit_price,
      promotional_price,
      promotion_starts_at,
      promotion_ends_at,
      is_active,
      price_tables (is_active, valid_from, valid_until)
      `,
    )
    .eq('price_table_id', sessionInfo.priceTableId)
    .in('variant_id', variantIds)
    .eq('is_active', true)

  if (!rawPrices) return priceMap

  const typedPrices = rawPrices as unknown as Array<{
    variant_id: string
    unit_price: number
    promotional_price: number | null
    promotion_starts_at: string | null
    promotion_ends_at: string | null
    is_active: boolean
    price_tables: { is_active: boolean; valid_from: string | null; valid_until: string | null } | null
  }>

  const now = new Date()

  for (const item of typedPrices) {
    // Validar tabela ativa e período
    if (!item.price_tables || !item.price_tables.is_active) continue
    if (item.price_tables.valid_from && new Date(item.price_tables.valid_from) > now) continue
    if (item.price_tables.valid_until && new Date(item.price_tables.valid_until) < now) continue

    const hasValidPromo = isPromotionValid(
      item.promotional_price,
      item.unit_price,
      item.promotion_starts_at,
      item.promotion_ends_at,
    )

    const effective_price = hasValidPromo ? (item.promotional_price as number) : item.unit_price

    priceMap.set(item.variant_id, {
      unit_price: Number(item.unit_price),
      promotional_price: hasValidPromo ? Number(item.promotional_price) : null,
      effective_price: Number(effective_price),
      is_on_promotion: hasValidPromo,
    })
  }

  return priceMap
}

/**
 * Helper Server-Only: Permite que Vendedores (seller/admin) consultem preços para empresas especificamente atribuídas.
 * Valida obrigatoriamente se seller_id === user.id (ou se o usuário é admin) antes de consultar a empresa.
 * Se a empresa não estiver atribuída ao vendedor, a requisição é REJEITADA.
 */
export async function getSellerCompanyPricing(
  targetCompanyId: string,
  variantId: string,
): Promise<PriceInfo | undefined> {
  if (!targetCompanyId || !variantId) return undefined

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return undefined

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as { role: string } | null
  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return undefined
  }

  // Se for seller, verificar obrigatoriamente se a empresa está atribuída a ele (seller_id === user.id)
  let query = supabase
    .from('companies')
    .select('id, status, price_table_id, seller_id')
    .eq('id', targetCompanyId)

  if (profile.role === 'seller') {
    query = query.eq('seller_id', user.id)
  }

  const { data: companyData } = await query.maybeSingle()
  const company = companyData as { id: string; status: string; price_table_id: string | null } | null

  if (!company || company.status !== 'approved' || !company.price_table_id) {
    // Empresa não atribuída ao vendedor ou não aprovada -> REJEITAR
    return undefined
  }

  // Consultar preço para a variante naquela tabela
  const { data: rawPrice } = await supabase
    .from('price_table_products')
    .select(
      `
      unit_price,
      promotional_price,
      promotion_starts_at,
      promotion_ends_at,
      is_active,
      price_tables (is_active, valid_from, valid_until)
      `,
    )
    .eq('price_table_id', company.price_table_id)
    .eq('variant_id', variantId)
    .eq('is_active', true)
    .maybeSingle()

  if (!rawPrice) return undefined

  const item = rawPrice as unknown as {
    unit_price: number
    promotional_price: number | null
    promotion_starts_at: string | null
    promotion_ends_at: string | null
    is_active: boolean
    price_tables: { is_active: boolean; valid_from: string | null; valid_until: string | null } | null
  }

  if (!item.price_tables || !item.price_tables.is_active) return undefined

  const hasValidPromo = isPromotionValid(
    item.promotional_price,
    item.unit_price,
    item.promotion_starts_at,
    item.promotion_ends_at,
  )

  const effective_price = hasValidPromo ? (item.promotional_price as number) : item.unit_price

  return {
    unit_price: Number(item.unit_price),
    promotional_price: hasValidPromo ? Number(item.promotional_price) : null,
    effective_price: Number(effective_price),
    is_on_promotion: hasValidPromo,
  }
}
