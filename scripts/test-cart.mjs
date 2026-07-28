/**
 * scripts/test-cart.mjs
 * BLOCO 12A — Suíte de testes do Carrinho Atômico contra o banco REMOTO real.
 *
 * Metodologia:
 *  - service_role (SUPABASE_SECRET_KEY): APENAS setup de fixtures, inspeção e
 *    cleanup. Nunca representa um usuário comercial nas asserções de negócio.
 *  - publishable key + login real: exercita as RPCs como customer/seller/admin/
 *    pendente/rejeitado/anon, validando RLS, grants, SECURITY DEFINER, no-ops,
 *    preço canônico, estoque, concorrência e isolamento.
 *
 * Regra de PASS: um teste só passa quando a regra de negócio é efetivamente
 * alcançada. Erro SQL inesperado, timeout ou exceção = FAIL.
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ── Carregar .env.local ─────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('💥 .env.local não encontrado.')
  process.exit(1)
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=')
    if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = 'DevelopmentPassword123!'

let hostname = ''
try { hostname = new URL(SUPA_URL).hostname } catch {}

if (!SUPA_URL || !ANON || !SECRET || hostname.includes('placeholder')) {
  console.error('💥 Configuração do Supabase inválida (URL/keys).')
  process.exit(1)
}

const svc = createClient(SUPA_URL, SECRET, { auth: { autoRefreshToken: false, persistSession: false } })

// ── Harness ─────────────────────────────────────────────────────────
let passed = 0, failed = 0
const failures = []
async function test(name, fn) {
  try {
    const ok = await fn()
    if (ok === true) { passed++; console.log(`  ✅ ${name}`) }
    else { failed++; failures.push(name); console.log(`  ❌ ${name}${ok ? ' | ' + ok : ''}`) }
  } catch (err) {
    failed++; failures.push(name)
    console.log(`  ❌ ${name} | EXCEÇÃO: ${err?.message ?? err}`)
  }
}
function section(t) { console.log(`\n── ${t} ──`) }

async function userClient(email) {
  const c = createClient(SUPA_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`login falhou ${email}: ${error.message}`)
  return c
}

// ── Lookups & fixtures (service_role) ───────────────────────────────
async function profileByEmail(email) {
  const { data } = await svc.from('profiles').select('id, role, company_id').eq('email', email).single()
  return data
}
async function companyByCnpj(cnpj) {
  const { data } = await svc.from('companies').select('id, price_table_id, status, seller_id').eq('cnpj', cnpj).single()
  return data
}

let catId, brandId
async function ensureCatalogBase() {
  const { data: cat } = await svc.from('categories').upsert(
    { name: 'CART Test Cat', slug: 'cart-test-cat', is_active: true }, { onConflict: 'slug' }).select('id').single()
  catId = cat.id
  const { data: br } = await svc.from('brands').upsert(
    { name: 'CART Test Brand', slug: 'cart-test-brand', is_active: true }, { onConflict: 'slug' }).select('id').single()
  brandId = br.id
}

async function ensureProduct(sku, o = {}) {
  const row = {
    sku, name: o.name ?? sku, slug: sku.toLowerCase(),
    category_id: catId, brand_id: brandId, unit: 'UN',
    min_quantity: o.min ?? 1, multiple_quantity: o.mult ?? 1,
    is_active: o.active ?? true, is_published: o.published ?? true,
  }
  const { data } = await svc.from('products').upsert(row, { onConflict: 'sku' }).select('id').single()
  return data.id
}
async function ensureVariant(productId, sku, o = {}) {
  const row = { product_id: productId, sku, name: o.name ?? sku, attributes: o.attrs ?? {}, is_active: o.active ?? true, min_quantity: 1, multiple_quantity: 1 }
  const { data } = await svc.from('product_variants').upsert(row, { onConflict: 'sku' }).select('id').single()
  return data.id
}
async function ensureInventory(productId, variantId, avail, reserved = 0) {
  let q = svc.from('inventories').select('id').eq('product_id', productId)
  q = variantId ? q.eq('variant_id', variantId) : q.is('variant_id', null)
  const { data: ex } = await q.maybeSingle()
  if (ex?.id) {
    await svc.from('inventories').update({ quantity_available: avail, quantity_reserved: reserved }).eq('id', ex.id)
  } else {
    await svc.from('inventories').insert({ product_id: productId, variant_id: variantId, quantity_available: avail, quantity_reserved: reserved, min_stock_alert: 0 })
  }
}
async function ensurePrice(tableId, productId, variantId, o) {
  const minq = o.minQty ?? 1
  let q = svc.from('price_table_products').select('id')
    .eq('price_table_id', tableId).eq('product_id', productId).eq('min_quantity', minq)
  q = variantId ? q.eq('variant_id', variantId) : q.is('variant_id', null)
  const { data: ex } = await q.maybeSingle()
  const row = {
    price_table_id: tableId, product_id: productId, variant_id: variantId,
    unit_price: o.unit, promotional_price: o.promo ?? null,
    promotion_starts_at: o.promoStart ?? null, promotion_ends_at: o.promoEnd ?? null,
    is_active: o.active ?? true, min_quantity: minq,
  }
  if (ex?.id) await svc.from('price_table_products').update(row).eq('id', ex.id)
  else await svc.from('price_table_products').insert(row)
}

async function resetCarts(profileId, companyId) {
  // Remove todos os carrinhos do par (cascade remove itens).
  await svc.from('carts').delete().eq('profile_id', profileId).eq('company_id', companyId)
}
async function countActiveCarts(profileId, companyId) {
  const { count } = await svc.from('carts').select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId).eq('company_id', companyId).eq('status', 'active')
  return count ?? 0
}
async function getActiveCart(profileId, companyId) {
  const { data } = await svc.from('carts').select('id').eq('profile_id', profileId).eq('company_id', companyId).eq('status', 'active').maybeSingle()
  return data?.id ?? null
}
async function getItems(cartId) {
  const { data } = await svc.from('cart_items').select('*').eq('cart_id', cartId)
  return data ?? []
}

// IDs globais
let F = {} // fixtures
let U = {} // usuários/empresas
let C = {} // clients
const FUT = '2099-12-31T23:59:59Z'
const PROMO_VALID_START = '2020-01-01T00:00:00Z'
const PROMO_FUT_START = '2099-01-01T00:00:00Z'
const PROMO_FUT_END = '2100-01-01T00:00:00Z'
const PROMO_EXP_START = '2019-01-01T00:00:00Z'
const PROMO_EXP_END = '2020-01-01T00:00:00Z'

async function setup() {
  console.log('🔧 Preparando fixtures (service_role)...')
  await ensureCatalogBase()

  U.customerA = await profileByEmail('aprovado@cliente.com.br')
  U.customerB = await profileByEmail('aprovado2@cliente.com.br')
  U.pending = await profileByEmail('pendente@cliente.com.br')
  U.rejected = await profileByEmail('recusado@cliente.com.br')
  U.seller = await profileByEmail('vendedor@atacado.com.br')
  U.admin = await profileByEmail('admin@atacado.com.br')
  U.companyA = await companyByCnpj('12345678000190') // Silva (seller=vendedor, tabela default)
  U.companyB = await companyByCnpj('22333444000155') // Lima (sem seller, tabela B)
  U.companyPending = await companyByCnpj('98765432000110')

  const tableA = U.companyA.price_table_id
  const tableB = U.companyB.price_table_id
  U.tableA = tableA; U.tableB = tableB

  // Empresa aprovada SEM tabela de preço (para COMPANY_NOT_ELIGIBLE / empresa sem tabela)
  const noTableCustomer = await ensureNoTableCustomer()
  U.customerNoTable = noTableCustomer.profile
  U.companyNoTable = noTableCustomer.company

  // Produtos/variantes/estoque/preços
  F.stdP = await ensureProduct('CART-P-STD', { min: 1, mult: 1 })
  F.stdV = await ensureVariant(F.stdP, 'CART-V-STD')
  await ensureInventory(F.stdP, F.stdV, 100, 10) // utilizável 90
  await ensurePrice(tableA, F.stdP, F.stdV, { unit: 10, minQty: 1 })
  await ensurePrice(tableB, F.stdP, F.stdV, { unit: 12, minQty: 1 }) // isolamento

  F.multP = await ensureProduct('CART-P-MULT', { min: 5, mult: 5 })
  F.multV = await ensureVariant(F.multP, 'CART-V-MULT')
  await ensureInventory(F.multP, F.multV, 100, 0)
  await ensurePrice(tableA, F.multP, F.multV, { unit: 20, minQty: 1 })

  F.minqP = await ensureProduct('CART-P-MINQ', { min: 10, mult: 1 })
  F.minqV = await ensureVariant(F.minqP, 'CART-V-MINQ')
  await ensureInventory(F.minqP, F.minqV, 100, 0)
  await ensurePrice(tableA, F.minqP, F.minqV, { unit: 30, minQty: 1 })
  // (sem preço em tableB → testa "nenhum fallback default" para customerB)

  F.tierP = await ensureProduct('CART-P-TIER', { min: 1, mult: 1 })
  F.tierV = await ensureVariant(F.tierP, 'CART-V-TIER')
  await ensureInventory(F.tierP, F.tierV, 500, 0)
  await ensurePrice(tableA, F.tierP, F.tierV, { unit: 100, minQty: 1 })
  await ensurePrice(tableA, F.tierP, F.tierV, { unit: 90, minQty: 10 })
  await ensurePrice(tableA, F.tierP, F.tierV, { unit: 80, minQty: 50 })

  F.promoP = await ensureProduct('CART-P-PROMO', { min: 1, mult: 1 })
  F.promoV = await ensureVariant(F.promoP, 'CART-V-PROMO')
  await ensureInventory(F.promoP, F.promoV, 100, 0)
  await ensurePrice(tableA, F.promoP, F.promoV, { unit: 50, promo: 40, promoStart: PROMO_VALID_START, promoEnd: FUT, minQty: 1 })

  F.pfutP = await ensureProduct('CART-P-PFUT', { min: 1, mult: 1 })
  F.pfutV = await ensureVariant(F.pfutP, 'CART-V-PFUT')
  await ensureInventory(F.pfutP, F.pfutV, 100, 0)
  await ensurePrice(tableA, F.pfutP, F.pfutV, { unit: 50, promo: 40, promoStart: PROMO_FUT_START, promoEnd: PROMO_FUT_END, minQty: 1 })

  F.pexpP = await ensureProduct('CART-P-PEXP', { min: 1, mult: 1 })
  F.pexpV = await ensureVariant(F.pexpP, 'CART-V-PEXP')
  await ensureInventory(F.pexpP, F.pexpV, 100, 0)
  await ensurePrice(tableA, F.pexpP, F.pexpV, { unit: 50, promo: 40, promoStart: PROMO_EXP_START, promoEnd: PROMO_EXP_END, minQty: 1 })

  F.noPriceP = await ensureProduct('CART-P-NOPRICE', { min: 1, mult: 1 })
  F.noPriceV = await ensureVariant(F.noPriceP, 'CART-V-NOPRICE')
  await ensureInventory(F.noPriceP, F.noPriceV, 100, 0)

  F.inactP = await ensureProduct('CART-P-INACT', { min: 1, mult: 1, active: false })
  F.inactV = await ensureVariant(F.inactP, 'CART-V-IA')
  await ensureInventory(F.inactP, F.inactV, 100, 0)
  await ensurePrice(tableA, F.inactP, F.inactV, { unit: 10, minQty: 1 })

  F.unpubP = await ensureProduct('CART-P-UNPUB', { min: 1, mult: 1, published: false })
  F.unpubV = await ensureVariant(F.unpubP, 'CART-V-UP')
  await ensureInventory(F.unpubP, F.unpubV, 100, 0)
  await ensurePrice(tableA, F.unpubP, F.unpubV, { unit: 10, minQty: 1 })

  F.variaP = await ensureProduct('CART-P-VARIA', { min: 1, mult: 1 })
  F.variaV = await ensureVariant(F.variaP, 'CART-V-VIA', { active: false })
  await ensureInventory(F.variaP, F.variaV, 100, 0)
  await ensurePrice(tableA, F.variaP, F.variaV, { unit: 10, minQty: 1 })

  F.lowP = await ensureProduct('CART-P-LOW', { min: 1, mult: 1 })
  F.lowV = await ensureVariant(F.lowP, 'CART-V-LOW')
  await ensureInventory(F.lowP, F.lowV, 5, 3) // utilizável 2
  await ensurePrice(tableA, F.lowP, F.lowV, { unit: 10, minQty: 1 })

  // Fallback de produto (entrada por variant_id NULL) na mesma tabela
  F.fallP = await ensureProduct('CART-P-FALL', { min: 1, mult: 1 })
  F.fallV = await ensureVariant(F.fallP, 'CART-V-FALL')
  await ensureInventory(F.fallP, F.fallV, 100, 0)
  await ensurePrice(tableA, F.fallP, null, { unit: 25, minQty: 1 }) // preço por produto (variant NULL)

  // Produto com preço e estoque a nível de produto (variant NULL) — add com variant NULL válido
  // Este produto tem ZERO linhas em product_variants (nenhuma ensureVariant chamada).
  F.pnullP = await ensureProduct('CART-P-PNULL', { min: 1, mult: 1 })
  await ensureInventory(F.pnullP, null, 100, 0)
  await ensurePrice(tableA, F.pnullP, null, { unit: 15, minQty: 1 })

  // Produto com DUAS variantes ativas (A e B), SKUs e preços distintos —
  // para comprovar que cada variante gera uma linha própria no carrinho.
  F.twoVarP = await ensureProduct('CART-P-TWOVAR', { min: 1, mult: 1 })
  F.twoVarA = await ensureVariant(F.twoVarP, 'CART-V-TWOVAR-A', { name: 'Opção A' })
  F.twoVarB = await ensureVariant(F.twoVarP, 'CART-V-TWOVAR-B', { name: 'Opção B' })
  await ensureInventory(F.twoVarP, F.twoVarA, 50, 0)
  await ensureInventory(F.twoVarP, F.twoVarB, 30, 0)
  await ensurePrice(tableA, F.twoVarP, F.twoVarA, { unit: 11, minQty: 1 })
  await ensurePrice(tableA, F.twoVarP, F.twoVarB, { unit: 22, minQty: 1 })

  console.log('✅ Fixtures prontas.\n')
}

async function ensureNoTableCustomer() {
  const email = 'cart-notable@cliente.com.br'
  const { data: list } = await svc.auth.admin.listUsers()
  let uid = list?.users?.find((u) => u.email === email)?.id
  if (!uid) {
    const { data, error } = await svc.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'Cart NoTable', role: 'customer' } })
    if (error) throw error
    uid = data.user.id
  }
  await svc.from('profiles').upsert({ id: uid, full_name: 'Cart NoTable', email, role: 'customer', status: 'active', updated_at: new Date().toISOString() })
  const { data: comp } = await svc.from('companies').upsert(
    { cnpj: '11222333000199', company_name: 'Cart NoTable LTDA', trade_name: 'Cart NoTable', status: 'approved', price_table_id: null, email, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'cnpj' }).select('id').single()
  await svc.from('profiles').update({ company_id: comp.id }).eq('id', uid)
  return { profile: { id: uid, role: 'customer', company_id: comp.id }, company: { id: comp.id } }
}

// Helpers de chamada de RPC
async function add(client, args) {
  const { data, error } = await client.rpc('add_to_cart_atomic', args)
  return { data, error }
}

async function main() {
  console.log(`=== BLOCO 12A · TESTES DO CARRINHO (host ${hostname}) ===`)
  await setup()

  C.customerA = await userClient('aprovado@cliente.com.br')
  C.customerB = await userClient('aprovado2@cliente.com.br')
  C.pending = await userClient('pendente@cliente.com.br')
  C.rejected = await userClient('recusado@cliente.com.br')
  C.seller = await userClient('vendedor@atacado.com.br')
  C.admin = await userClient('admin@atacado.com.br')
  C.noTable = await userClient('cart-notable@cliente.com.br')
  C.anon = createClient(SUPA_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })

  const A = () => resetCarts(U.customerA.id, U.companyA.id)

  // ══════════════ ACESSO ══════════════
  section('ACESSO')
  await test('anon bloqueado ao adicionar (sem EXECUTE ou UNAUTHENTICATED)', async () => {
    const { data, error } = await add(C.anon, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return !!error || (data?.success === false && data?.code === 'UNAUTHENTICATED')
  })
  await test('customer pendente bloqueado (COMPANY_NOT_ELIGIBLE)', async () => {
    const { data } = await add(C.pending, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === false && data?.code === 'COMPANY_NOT_ELIGIBLE'
  })
  await test('customer rejeitado bloqueado (COMPANY_NOT_ELIGIBLE)', async () => {
    const { data } = await add(C.rejected, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === false && data?.code === 'COMPANY_NOT_ELIGIBLE'
  })
  await test('customer aprovado permitido', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === true
  })
  await test('seller permitido para empresa da própria carteira', async () => {
    await resetCarts(U.seller.id, U.companyA.id)
    const { data } = await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyA.id })
    return data?.success === true
  })
  await test('seller bloqueado para empresa alheia (FORBIDDEN)', async () => {
    const { data } = await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyB.id })
    return data?.success === false && data?.code === 'FORBIDDEN'
  })
  await test('seller sem target exige empresa (TARGET_COMPANY_REQUIRED)', async () => {
    const { data } = await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === false && data?.code === 'TARGET_COMPANY_REQUIRED'
  })
  await test('admin bloqueado no carrinho comercial (FORBIDDEN)', async () => {
    const { data } = await add(C.admin, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === false && data?.code === 'FORBIDDEN'
  })
  await test('customer não pode escolher outra empresa (FORBIDDEN)', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyB.id })
    return data?.success === false && data?.code === 'FORBIDDEN'
  })
  await test('RPC não aceita profile_id (parâmetro inexistente)', async () => {
    const { error } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_profile_id: U.admin.id })
    return !!error
  })
  await test('RPC não aceita preço (parâmetro inexistente)', async () => {
    const { error } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_unit_price: 1 })
    return !!error
  })
  await test('empresa aprovada sem tabela → COMPANY_NOT_ELIGIBLE', async () => {
    const { data } = await add(C.noTable, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === false && data?.code === 'COMPANY_NOT_ELIGIBLE'
  })

  // ══════════════ CARRINHO ══════════════
  section('CARRINHO')
  await test('primeiro carrinho é criado', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.success === true && (await countActiveCarts(U.customerA.id, U.companyA.id)) === 1
  })
  await test('reutiliza o mesmo carrinho active', async () => {
    const first = await getActiveCart(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.multV, p_quantity: 5 })
    const second = await getActiveCart(U.customerA.id, U.companyA.id)
    return first && second && first === second && (await countActiveCarts(U.customerA.id, U.companyA.id)) === 1
  })
  await test('duas criações concorrentes → um único carrinho', async () => {
    await A()
    await Promise.all([
      add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 }),
      add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 }),
    ])
    return (await countActiveCarts(U.customerA.id, U.companyA.id)) === 1
  })
  await test('cinco criações concorrentes → um único carrinho e soma correta', async () => {
    await A()
    const r = await Promise.all(Array.from({ length: 5 }, () => add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })))
    const allOk = r.every((x) => x.data?.success === true)
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const items = await getItems(cart)
    return allOk && (await countActiveCarts(U.customerA.id, U.companyA.id)) === 1 && items.length === 1 && items[0].quantity === 5
  })
  await test('somente um carrinho active (índice único bloqueia 2º active)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const { error } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'active' })
    return !!error
  })
  await test('carrinhos de seller e customer são separados por empresa', async () => {
    await A(); await resetCarts(U.seller.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyA.id })
    const cCart = await getActiveCart(U.customerA.id, U.companyA.id)
    const sCart = await getActiveCart(U.seller.id, U.companyA.id)
    return cCart && sCart && cCart !== sCart
  })
  await test('carrinho converted não é mutado (novo active é criado)', async () => {
    await A()
    const { data: conv } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'converted' }).select('id').single()
    await svc.from('cart_items').insert({ cart_id: conv.id, profile_id: U.customerA.id, product_id: F.stdP, variant_id: F.stdV, quantity: 3 })
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const convItems = await getItems(conv.id)
    const activeCart = await getActiveCart(U.customerA.id, U.companyA.id)
    const ok = convItems.length === 1 && convItems[0].quantity === 3 && activeCart && activeCart !== conv.id
    await svc.from('carts').delete().eq('id', conv.id)
    return ok
  })
  await test('carrinho abandoned não é mutado (novo active é criado)', async () => {
    await A()
    const { data: ab } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'abandoned' }).select('id').single()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const activeCart = await getActiveCart(U.customerA.id, U.companyA.id)
    const ok = activeCart && activeCart !== ab.id
    await svc.from('carts').delete().eq('id', ab.id)
    return ok
  })
  await test('company_id é obrigatório (constraint bloqueia NULL)', async () => {
    const { error } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: null, status: 'active' })
    return !!error
  })
  await test('status inválido é bloqueado (CHECK constraint)', async () => {
    const { error } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyB.id, status: 'bogus' })
    return !!error
  })

  // ══════════════ ITEM ══════════════
  section('ITEM')
  await test('item novo é inserido', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    return data?.success === true && (await getItems(cart)).length === 1
  })
  await test('item repetido soma a quantidade', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 2 })
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 3 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const items = await getItems(cart)
    return data?.quantity == 5 && items.length === 1 && items[0].quantity === 5
  })
  await test('variante NULL não duplica (mesma chave)', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.pnullP, p_variant_id: null, p_quantity: 1 })
    await add(C.customerA, { p_product_id: F.pnullP, p_variant_id: null, p_quantity: 1 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const items = (await getItems(cart)).filter((i) => i.product_id === F.pnullP)
    return items.length === 1 && items[0].quantity === 2
  })
  await test('variante específica não duplica', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    return (await getItems(cart)).length === 1
  })
  await test('update válido altera a quantidade', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 2 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 7 })
    return data?.success === true && data?.changed === true && data?.quantity === 7
  })
  await test('update com a mesma quantidade é no-op (changed=false)', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 7 })
    return data?.success === true && data?.changed === false
  })
  await test('remove válido remove o item', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('remove_cart_item_atomic', { p_item_id: itemId })
    return data?.success === true && data?.changed === true && (await getItems(cart)).length === 0
  })
  await test('remove item inexistente é no-op (changed=false)', async () => {
    const { data } = await C.customerA.rpc('remove_cart_item_atomic', { p_item_id: '00000000-0000-0000-0000-000000000000' })
    return data?.success === true && data?.changed === false
  })
  await test('remove item alheio não vaza e é no-op', async () => {
    // item do carrinho de customerB, tentado por customerA
    await resetCarts(U.customerB.id, U.companyB.id)
    await add(C.customerB, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const bCart = await getActiveCart(U.customerB.id, U.companyB.id)
    const bItem = (await getItems(bCart))[0].id
    const { data } = await C.customerA.rpc('remove_cart_item_atomic', { p_item_id: bItem })
    const stillThere = (await getItems(bCart)).length === 1
    return data?.success === true && data?.changed === false && stillThere
  })
  await test('clear válido esvazia o carrinho', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.multV, p_quantity: 5 })
    const { data } = await C.customerA.rpc('clear_cart_atomic', { p_target_company_id: null })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    return data?.success === true && data?.changed === true && (await getItems(cart)).length === 0
  })
  await test('clear em carrinho vazio é no-op (changed=false)', async () => {
    const { data } = await C.customerA.rpc('clear_cart_atomic', { p_target_company_id: null })
    return data?.success === true && data?.changed === false
  })
  await test('update em item alheio é no-op', async () => {
    const bCart = await getActiveCart(U.customerB.id, U.companyB.id)
    const bItem = (await getItems(bCart))[0]?.id
    if (!bItem) { await add(C.customerB, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 }) }
    const bItem2 = (await getItems(await getActiveCart(U.customerB.id, U.companyB.id)))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: bItem2, p_quantity: 9 })
    return data?.success === true && data?.changed === false
  })
  await test('profile_id do item é sincronizado pelo banco (trigger)', async () => {
    await A()
    const { data: cart } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'active' }).select('id').single()
    // Tenta forjar profile_id alheio no INSERT direto (service_role) — trigger deve sobrescrever
    await svc.from('cart_items').insert({ cart_id: cart.id, profile_id: U.admin.id, product_id: F.stdP, variant_id: F.stdV, quantity: 1 })
    const items = await getItems(cart.id)
    return items.length === 1 && items[0].profile_id === U.customerA.id
  })
  await test('mudança de cart_id de um item é bloqueada (trigger)', async () => {
    await A()
    const { data: c1 } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'active' }).select('id').single()
    const { data: c2 } = await svc.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyB.id, status: 'active' }).select('id').single()
    const { data: it } = await svc.from('cart_items').insert({ cart_id: c1.id, profile_id: U.customerA.id, product_id: F.stdP, variant_id: F.stdV, quantity: 1 }).select('id').single()
    const { error } = await svc.from('cart_items').update({ cart_id: c2.id }).eq('id', it.id)
    await svc.from('carts').delete().in('id', [c1.id, c2.id])
    return !!error
  })

  // ══════════════ PRODUTO E VARIANTE ══════════════
  section('PRODUTO E VARIANTE')
  await test('produto inexistente → PRODUCT_NOT_FOUND', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 })
    return data?.code === 'PRODUCT_NOT_FOUND'
  })
  await test('produto inativo → PRODUCT_INACTIVE', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.inactP, p_variant_id: F.inactV, p_quantity: 1 })
    return data?.code === 'PRODUCT_INACTIVE'
  })
  await test('produto não publicado → PRODUCT_NOT_PUBLISHED', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.unpubP, p_variant_id: F.unpubV, p_quantity: 1 })
    return data?.code === 'PRODUCT_NOT_PUBLISHED'
  })
  await test('variante inexistente → VARIANT_NOT_FOUND', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 })
    return data?.code === 'VARIANT_NOT_FOUND'
  })
  await test('variante inativa → VARIANT_INACTIVE', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.variaP, p_variant_id: F.variaV, p_quantity: 1 })
    return data?.code === 'VARIANT_INACTIVE'
  })
  await test('variante de outro produto → VARIANT_WRONG_PRODUCT', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.stdV, p_quantity: 5 })
    return data?.code === 'VARIANT_WRONG_PRODUCT'
  })
  await test('variant_id NULL válido (preço por produto)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.pnullP, p_variant_id: null, p_quantity: 1 })
    return data?.success === true
  })
  await test('variant_id NULL inválido (produto só tem preço por variante) → NO_PRICE_AVAILABLE', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: null, p_quantity: 1 })
    return data?.code === 'NO_PRICE_AVAILABLE'
  })
  await test('produto com zero variantes tem 0 linhas em product_variants', async () => {
    const { count } = await svc.from('product_variants').select('id', { count: 'exact', head: true }).eq('product_id', F.pnullP)
    return count === 0
  })
  await test('produto com uma variante ativa (fixture padrão) tem exatamente 1 linha', async () => {
    const { count } = await svc.from('product_variants').select('id', { count: 'exact', head: true }).eq('product_id', F.stdP).eq('is_active', true)
    return count === 1
  })
  await test('produto com duas variantes ativas tem exatamente 2 linhas', async () => {
    const { count } = await svc.from('product_variants').select('id', { count: 'exact', head: true }).eq('product_id', F.twoVarP).eq('is_active', true)
    return count === 2
  })
  await test('variante A é adicionada como variante A (SKU/preço corretos)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.twoVarP, p_variant_id: F.twoVarA, p_quantity: 1 })
    const row = (await readCart(C.customerA)).find((x) => x.variant_id === F.twoVarA)
    return data?.success === true && row && row.variant_sku === 'CART-V-TWOVAR-A' && Number(row.effective_price) === 11
  })
  await test('variante B é adicionada como variante B (SKU/preço corretos)', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.twoVarP, p_variant_id: F.twoVarB, p_quantity: 1 })
    const row = (await readCart(C.customerA)).find((x) => x.variant_id === F.twoVarB)
    return data?.success === true && row && row.variant_sku === 'CART-V-TWOVAR-B' && Number(row.effective_price) === 22
  })
  await test('variante A e variante B aparecem como duas linhas distintas no mesmo carrinho', async () => {
    const rows = await readCart(C.customerA)
    const a = rows.find((x) => x.variant_id === F.twoVarA)
    const b = rows.find((x) => x.variant_id === F.twoVarB)
    return a && b && a.item_id !== b.item_id
  })
  await test('atualizar a quantidade da variante A não altera a variante B', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const items = await getItems(cart)
    const itemA = items.find((i) => i.variant_id === F.twoVarA)
    const itemBBefore = items.find((i) => i.variant_id === F.twoVarB)
    await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemA.id, p_quantity: 5 })
    const itemBAfter = (await getItems(cart)).find((i) => i.variant_id === F.twoVarB)
    return itemBAfter.quantity === itemBBefore.quantity
  })
  await test('remover a variante A não remove a variante B', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const items = await getItems(cart)
    const itemA = items.find((i) => i.variant_id === F.twoVarA)
    await C.customerA.rpc('remove_cart_item_atomic', { p_item_id: itemA.id })
    const remaining = await getItems(cart)
    return remaining.length === 1 && remaining[0].variant_id === F.twoVarB
  })
  await test('leitura do carrinho traz variant_id e SKU corretos por linha', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.twoVarP, p_variant_id: F.twoVarB, p_quantity: 2 })
    const row = (await readCart(C.customerA)).find((x) => x.product_id === F.twoVarP)
    return row && row.variant_id === F.twoVarB && row.variant_sku === 'CART-V-TWOVAR-B'
  })

  // ══════════════ QUANTIDADE ══════════════
  section('QUANTIDADE')
  await test('mínimo válido (>= min_quantity)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 10 })
    return data?.success === true
  })
  await test('abaixo do mínimo → BELOW_MIN_QUANTITY', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 5 })
    return data?.code === 'BELOW_MIN_QUANTITY' && data?.min_quantity === 10
  })
  await test('múltiplo válido', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.multV, p_quantity: 10 })
    return data?.success === true
  })
  await test('múltiplo inválido → INVALID_MULTIPLE', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.multV, p_quantity: 7 })
    return data?.code === 'INVALID_MULTIPLE' && data?.multiple_quantity === 5
  })
  await test('quantidade zero → INVALID_QUANTITY', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 0 })
    return data?.code === 'INVALID_QUANTITY'
  })
  await test('quantidade negativa → INVALID_QUANTITY', async () => {
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: -3 })
    return data?.code === 'INVALID_QUANTITY'
  })
  await test('quantidade decimal é rejeitada (boundary integer)', async () => {
    const { data, error } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1.5 })
    return !!error || data?.success === false
  })
  await test('overflow de quantidade é rejeitado', async () => {
    const { data, error } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 3000000000 })
    return !!error || data?.success === false
  })
  await test('soma usa a quantidade final (min aplicado ao total)', async () => {
    // minq produto min 10: adicionar 6 falha, mas 6+6=12 também deve validar min no total
    await A()
    const r1 = await add(C.customerA, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 10 })
    const r2 = await add(C.customerA, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 5 })
    return r1.data?.success === true && r2.data?.success === true && r2.data?.quantity == 15
  })
  await test('update usa a quantidade integral informada', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 10 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 5 })
    return data?.code === 'BELOW_MIN_QUANTITY'
  })

  // ══════════════ PREÇO ══════════════
  section('PREÇO')
  await test('empresa sem tabela não precifica (COMPANY_NOT_ELIGIBLE)', async () => {
    const { data } = await add(C.noTable, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.code === 'COMPANY_NOT_ELIGIBLE'
  })
  await test('preço específico de variante (tier min 1 = 100)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.tierP, p_variant_id: F.tierV, p_quantity: 1 })
    const rows = await readCart(C.customerA)
    const r = rows.find((x) => x.variant_id === F.tierV)
    return r && Number(r.effective_price) === 100
  })
  await test('tier: quantidade 9 usa tier min 1 (=100)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.tierP, p_variant_id: F.tierV, p_quantity: 9 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.tierV)
    return r && Number(r.effective_price) === 100
  })
  await test('tier: quantidade 10 usa tier min 10 (=90)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.tierP, p_variant_id: F.tierV, p_quantity: 10 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.tierV)
    return r && Number(r.effective_price) === 90
  })
  await test('tier: quantidade 49 usa tier min 10 (=90)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.tierP, p_variant_id: F.tierV, p_quantity: 49 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.tierV)
    return r && Number(r.effective_price) === 90
  })
  await test('tier: quantidade 50 usa tier min 50 (=80)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.tierP, p_variant_id: F.tierV, p_quantity: 50 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.tierV)
    return r && Number(r.effective_price) === 80
  })
  await test('fallback de produto (variant NULL) na mesma tabela (=25)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.fallP, p_variant_id: F.fallV, p_quantity: 1 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.fallV)
    return r && Number(r.effective_price) === 25
  })
  await test('promoção vigente aplica preço promocional (=40)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.promoP, p_variant_id: F.promoV, p_quantity: 1 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.promoV)
    return r && Number(r.effective_price) === 40 && r.is_on_promotion === true
  })
  await test('promoção futura NÃO aplica (usa preço normal 50)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.pfutP, p_variant_id: F.pfutV, p_quantity: 1 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.pfutV)
    return r && Number(r.effective_price) === 50 && r.is_on_promotion === false
  })
  await test('promoção expirada NÃO aplica (usa preço normal 50)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.pexpP, p_variant_id: F.pexpV, p_quantity: 1 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.pexpV)
    return r && Number(r.effective_price) === 50 && r.is_on_promotion === false
  })
  await test('produto sem preço → NO_PRICE_AVAILABLE', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.noPriceP, p_variant_id: F.noPriceV, p_quantity: 1 })
    return data?.code === 'NO_PRICE_AVAILABLE'
  })
  await test('nenhum fallback default: customerB sem preço na sua tabela → NO_PRICE_AVAILABLE', async () => {
    await resetCarts(U.customerB.id, U.companyB.id)
    const { data } = await add(C.customerB, { p_product_id: F.minqP, p_variant_id: F.minqV, p_quantity: 10 })
    return data?.code === 'NO_PRICE_AVAILABLE'
  })
  await test('isolamento de empresa: A=10 e B=12 para o mesmo item', async () => {
    await A(); await resetCarts(U.customerB.id, U.companyB.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await add(C.customerB, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const a = (await readCart(C.customerA)).find((x) => x.variant_id === F.stdV)
    const b = (await readCart(C.customerB)).find((x) => x.variant_id === F.stdV)
    return a && b && Number(a.effective_price) === 10 && Number(b.effective_price) === 12
  })
  await test('line_total = preço efetivo × quantidade', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 4 })
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.stdV)
    return r && Number(r.line_total) === 40
  })
  await test('inativa entrada de preço → sem preço (NO_PRICE_AVAILABLE)', async () => {
    // desativa a entrada de preço std na tabela A, tenta adicionar, reativa
    await svc.from('price_table_products').update({ is_active: false }).eq('price_table_id', U.tableA).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await svc.from('price_table_products').update({ is_active: true }).eq('price_table_id', U.tableA).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    return data?.code === 'NO_PRICE_AVAILABLE'
  })

  // ══════════════ ESTOQUE ══════════════
  section('ESTOQUE')
  await test('estoque utilizável permite adicionar até o limite (90)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 90 })
    return data?.success === true
  })
  await test('reservado é descontado (91 > 90 → INSUFFICIENT_STOCK, available=90)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 91 })
    return data?.code === 'INSUFFICIENT_STOCK' && data?.available === 90
  })
  await test('quantidade final acima do utilizável (low usable=2)', async () => {
    await A()
    const { data } = await add(C.customerA, { p_product_id: F.lowP, p_variant_id: F.lowV, p_quantity: 3 })
    return data?.code === 'INSUFFICIENT_STOCK' && data?.available === 2
  })
  await test('add não altera quantity_available nem quantity_reserved', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 5 })
    const { data: inv } = await svc.from('inventories').select('quantity_available, quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    return inv.quantity_available === 100 && inv.quantity_reserved === 10
  })
  await test('update não altera available nem reserved', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart)).find((i) => i.variant_id === F.stdV).id
    await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 8 })
    const { data: inv } = await svc.from('inventories').select('quantity_available, quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    return inv.quantity_available === 100 && inv.quantity_reserved === 10
  })
  await test('concorrência do carrinho não reserva estoque', async () => {
    await A()
    await Promise.all(Array.from({ length: 5 }, () => add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })))
    const { data: inv } = await svc.from('inventories').select('quantity_available, quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    return inv.quantity_available === 100 && inv.quantity_reserved === 10
  })
  await test('update acima do estoque utilizável → INSUFFICIENT_STOCK', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 91 })
    return data?.code === 'INSUFFICIENT_STOCK'
  })

  // ══════════════ SEGURANÇA ══════════════
  section('SEGURANÇA')
  await test('INSERT direto em carts bloqueado (authenticated)', async () => {
    const { error } = await C.customerA.from('carts').insert({ profile_id: U.customerA.id, company_id: U.companyA.id, status: 'active' })
    return !!error
  })
  await test('UPDATE direto em carts bloqueado', async () => {
    await A(); await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const { error, data } = await C.customerA.from('carts').update({ status: 'abandoned' }).eq('id', cart).select('id')
    return !!error || !data || data.length === 0
  })
  await test('DELETE direto em carts bloqueado', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const { error, data } = await C.customerA.from('carts').delete().eq('id', cart).select('id')
    const still = await getActiveCart(U.customerA.id, U.companyA.id)
    return (!!error || !data || data.length === 0) && !!still
  })
  await test('INSERT direto em cart_items bloqueado', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const { error } = await C.customerA.from('cart_items').insert({ cart_id: cart, profile_id: U.customerA.id, product_id: F.stdP, variant_id: F.multV, quantity: 1 })
    return !!error
  })
  await test('UPDATE direto em cart_items bloqueado', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { error, data } = await C.customerA.from('cart_items').update({ quantity: 999 }).eq('id', itemId).select('id')
    return !!error || !data || data.length === 0
  })
  await test('DELETE direto em cart_items bloqueado', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { error, data } = await C.customerA.from('cart_items').delete().eq('id', itemId).select('id')
    const still = (await getItems(cart)).length === 1
    return (!!error || !data || data.length === 0) && still
  })
  await test('helper resolve_cart_price_canonical não é executável por authenticated', async () => {
    const { error } = await C.customerA.rpc('resolve_cart_price_canonical', { p_company_id: U.companyA.id, p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return !!error
  })
  await test('helper de preço não é executável por anon', async () => {
    const { error } = await C.anon.rpc('resolve_cart_price_canonical', { p_company_id: U.companyA.id, p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return !!error
  })
  await test('get_active_cart_with_prices não vaza SQL/stack no retorno', async () => {
    const { data } = await C.customerA.rpc('get_active_cart_with_prices', { p_target_company_id: null })
    const s = JSON.stringify(data ?? [])
    return !/select |from |pg_|stack|secret|password|sb_secret/i.test(s)
  })
  await test('códigos de erro não contêm SQL nem segredos', async () => {
    const { data } = await add(C.customerA, { p_product_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 })
    const s = JSON.stringify(data ?? {})
    return !/select |from |pg_|sb_secret|password/i.test(s)
  })
  await test('customer não lê carrinho de outra empresa (RLS SELECT)', async () => {
    // customerA tenta ler diretamente carts de customerB
    const bCart = await getActiveCart(U.customerB.id, U.companyB.id)
    const { data } = await C.customerA.from('carts').select('id').eq('id', bCart ?? '00000000-0000-0000-0000-000000000000')
    return (data ?? []).length === 0
  })
  await test('anon não lê nenhum carrinho (RLS SELECT)', async () => {
    const { data } = await C.anon.from('carts').select('id').limit(5)
    return (data ?? []).length === 0
  })

  // ══════════════ COBERTURA ADICIONAL ══════════════
  section('COBERTURA ADICIONAL')
  await test('update para múltiplo inválido → INVALID_MULTIPLE', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.multP, p_variant_id: F.multV, p_quantity: 5 })
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    const itemId = (await getItems(cart))[0].id
    const { data } = await C.customerA.rpc('update_cart_item_atomic', { p_item_id: itemId, p_quantity: 7 })
    return data?.code === 'INVALID_MULTIPLE'
  })
  await test('soma respeita estoque no total (90 + 1 → INSUFFICIENT_STOCK)', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 90 })
    const { data } = await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    return data?.code === 'INSUFFICIENT_STOCK' && data?.available === 90
  })
  await test('get_active_cart_with_prices marca item indisponível quando estoque cai abaixo', async () => {
    await A()
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 80 })
    // reduz utilizável para 50 (available 60, reserved 10)
    await svc.from('inventories').update({ quantity_available: 60, quantity_reserved: 10 }).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    const r = (await readCart(C.customerA)).find((x) => x.variant_id === F.stdV)
    // restaura
    await svc.from('inventories').update({ quantity_available: 100, quantity_reserved: 10 }).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    return r && r.is_available === false && /estoque/i.test(r.unavailable_reason ?? '')
  })
  await test('seller lê carrinho apenas da empresa selecionada (get_active com target)', async () => {
    await resetCarts(U.seller.id, U.companyA.id)
    await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyA.id })
    const { data } = await C.seller.rpc('get_active_cart_with_prices', { p_target_company_id: U.companyA.id })
    return Array.isArray(data) && data.length === 1
  })
  await test('seller sem target não retorna itens (get_active vazio)', async () => {
    const { data } = await C.seller.rpc('get_active_cart_with_prices', { p_target_company_id: null })
    return Array.isArray(data) && data.length === 0
  })
  await test('seller clear na empresa da carteira funciona', async () => {
    await resetCarts(U.seller.id, U.companyA.id)
    await add(C.seller, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1, p_target_company_id: U.companyA.id })
    const { data } = await C.seller.rpc('clear_cart_atomic', { p_target_company_id: U.companyA.id })
    return data?.success === true && data?.changed === true
  })
  await test('seller clear em empresa alheia é no-op', async () => {
    const { data } = await C.seller.rpc('clear_cart_atomic', { p_target_company_id: U.companyB.id })
    return data?.success === true && data?.changed === false
  })
  await test('admin get_active_cart_with_prices retorna vazio (fora do fluxo comercial)', async () => {
    const { data } = await C.admin.rpc('get_active_cart_with_prices', { p_target_company_id: U.companyA.id })
    return Array.isArray(data) && data.length === 0
  })

  // ── cleanup carrinhos de teste ──
  await resetCarts(U.customerA.id, U.companyA.id)
  await resetCarts(U.customerB.id, U.companyB.id)
  await resetCarts(U.seller.id, U.companyA.id)
  await resetCarts(U.customerNoTable, U.companyNoTable)

  // ── teardown das fixtures CART-* (evita inflar contagens de outras suítes) ──
  // O cascade remove variantes, estoques, preços e itens de carrinho vinculados.
  const { data: cartProds } = await svc.from('products').select('id').like('sku', 'CART-P-%')
  if (cartProds?.length) {
    await svc.from('products').delete().in('id', cartProds.map((p) => p.id))
  }
  // A empresa/usuário "cart-notable" é idempotente e inofensiva (não é catálogo);
  // mantida para reutilização entre execuções.

  console.log(`\n📊 RESULTADO CART: ${passed} PASS / ${failed} FAIL (total ${passed + failed})`)
  if (failed > 0) {
    console.log('\nFalhas:')
    for (const f of failures) console.log('  - ' + f)
    process.exit(1)
  }
  console.log('🎉 Todos os testes do carrinho passaram.')
}

async function readCart(client) {
  const { data, error } = await client.rpc('get_active_cart_with_prices', { p_target_company_id: null })
  if (error) throw new Error('readCart RPC error: ' + error.message)
  return data ?? []
}

main().catch((err) => {
  console.error('💥 FALHA GERAL:', err?.message ?? err)
  process.exit(1)
})
