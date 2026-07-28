/**
 * scripts/test-checkout.mjs
 * BLOCO 12B — Testes críticos do Checkout Atômico contra o banco REMOTO real.
 *
 * service_role: apenas setup de fixtures, inspeção e cleanup.
 * publishable key + login real: exercita a RPC checkout_atomic como
 * customer/seller reais, validando revalidação, idempotência, concorrência,
 * rollback e snapshot.
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) { console.error('💥 .env.local não encontrado.'); process.exit(1) }
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

if (!SUPA_URL || !ANON || !SECRET) { console.error('💥 Configuração do Supabase inválida.'); process.exit(1) }

const svc = createClient(SUPA_URL, SECRET, { auth: { autoRefreshToken: false, persistSession: false } })

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
  const { data: cat } = await svc.from('categories').upsert({ name: 'CHK Test Cat', slug: 'chk-test-cat', is_active: true }, { onConflict: 'slug' }).select('id').single()
  catId = cat.id
  const { data: br } = await svc.from('brands').upsert({ name: 'CHK Test Brand', slug: 'chk-test-brand', is_active: true }, { onConflict: 'slug' }).select('id').single()
  brandId = br.id
}
async function ensureProduct(sku, o = {}) {
  const row = { sku, name: o.name ?? sku, slug: sku.toLowerCase(), category_id: catId, brand_id: brandId, unit: 'UN', min_quantity: o.min ?? 1, multiple_quantity: o.mult ?? 1, is_active: o.active ?? true, is_published: o.published ?? true }
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
  if (ex?.id) await svc.from('inventories').update({ quantity_available: avail, quantity_reserved: reserved }).eq('id', ex.id)
  else await svc.from('inventories').insert({ product_id: productId, variant_id: variantId, quantity_available: avail, quantity_reserved: reserved, min_stock_alert: 0 })
}
async function ensurePrice(tableId, productId, variantId, o) {
  const minq = o.minQty ?? 1
  let q = svc.from('price_table_products').select('id').eq('price_table_id', tableId).eq('product_id', productId).eq('min_quantity', minq)
  q = variantId ? q.eq('variant_id', variantId) : q.is('variant_id', null)
  const { data: ex } = await q.maybeSingle()
  const row = { price_table_id: tableId, product_id: productId, variant_id: variantId, unit_price: o.unit, promotional_price: o.promo ?? null, promotion_starts_at: o.promoStart ?? null, promotion_ends_at: o.promoEnd ?? null, is_active: o.active ?? true, min_quantity: minq }
  if (ex?.id) await svc.from('price_table_products').update(row).eq('id', ex.id)
  else await svc.from('price_table_products').insert(row)
}
async function ensureAddress(profileId, companyId, label) {
  const { data: ex } = await svc.from('addresses').select('id').eq('profile_id', profileId).eq('label', label).maybeSingle()
  if (ex?.id) return ex.id
  const { data } = await svc.from('addresses').insert({
    profile_id: profileId, company_id: companyId, label,
    zip_code: '01000-000', street: 'Rua Teste Checkout', number: '100',
    neighborhood: 'Centro', city: 'São Paulo', state: 'SP', is_default: true,
  }).select('id').single()
  return data.id
}

async function resetCarts(profileId, companyId) {
  await svc.from('carts').delete().eq('profile_id', profileId).eq('company_id', companyId)
}
async function getActiveCart(profileId, companyId) {
  const { data } = await svc.from('carts').select('id, status').eq('profile_id', profileId).eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data
}
async function cleanupOrder(orderId) {
  if (!orderId) return
  await svc.from('order_status_history').delete().eq('order_id', orderId)
  await svc.from('order_items').delete().eq('order_id', orderId)
  await svc.from('orders').delete().eq('id', orderId)
}

let F = {}, U = {}, C = {}

async function checkout(client, key, addressId, targetCompanyId) {
  return client.rpc('checkout_atomic', {
    p_idempotency_key: key,
    p_shipping_address_id: addressId,
    p_target_company_id: targetCompanyId ?? null,
  })
}
async function add(client, args) {
  return client.rpc('add_to_cart_atomic', args)
}

async function setup() {
  console.log('🔧 Preparando fixtures de checkout (service_role)...')
  await ensureCatalogBase()

  U.customerA = await profileByEmail('aprovado@cliente.com.br')
  U.customerB = await profileByEmail('aprovado2@cliente.com.br')
  U.pending = await profileByEmail('pendente@cliente.com.br')
  U.seller = await profileByEmail('vendedor@atacado.com.br')
  U.companyA = await companyByCnpj('12345678000190')
  U.companyB = await companyByCnpj('22333444000155')

  const tableA = U.companyA.price_table_id
  const tableB = U.companyB.price_table_id
  U.tableA = tableA
  U.tableB = tableB

  U.addressA = await ensureAddress(U.customerA.id, U.companyA.id, 'CHECKOUT-TEST-A')
  U.addressB = await ensureAddress(U.customerB.id, U.companyB.id, 'CHECKOUT-TEST-B')

  F.stdP = await ensureProduct('CHK-P-STD', { min: 1, mult: 1 })
  F.stdV = await ensureVariant(F.stdP, 'CHK-V-STD')
  await ensureInventory(F.stdP, F.stdV, 100, 10) // usable 90
  await ensurePrice(tableA, F.stdP, F.stdV, { unit: 10, minQty: 1 })
  await ensurePrice(tableB, F.stdP, F.stdV, { unit: 15, minQty: 1 }) // customerB (isolamento/ownership tests)

  F.lowP = await ensureProduct('CHK-P-LOW', { min: 1, mult: 1 })
  F.lowV = await ensureVariant(F.lowP, 'CHK-V-LOW')
  await ensureInventory(F.lowP, F.lowV, 5, 4) // usable 1
  await ensurePrice(tableA, F.lowP, F.lowV, { unit: 20, minQty: 1 })

  console.log('✅ Fixtures de checkout prontas.\n')
}

async function main() {
  console.log(`=== BLOCO 12B · TESTES CRÍTICOS DO CHECKOUT (host ${new URL(SUPA_URL).hostname}) ===`)
  await setup()

  C.customerA = await userClient('aprovado@cliente.com.br')
  C.customerB = await userClient('aprovado2@cliente.com.br')
  C.pending = await userClient('pendente@cliente.com.br')
  C.seller = await userClient('vendedor@atacado.com.br')

  const createdOrders = []

  // ══════════════ CHECKOUT VÁLIDO ══════════════
  section('CHECKOUT VÁLIDO')
  let validOrderId = null
  await test('checkout válido cria pedido pending com totais corretos', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 3 })
    const key = crypto.randomUUID()
    const { data } = await checkout(C.customerA, key, U.addressA)
    if (data?.success) { validOrderId = data.order_id; createdOrders.push(data.order_id) }
    return data?.success === true && data?.status === 'pending' && Number(data.subtotal) === 30 && Number(data.total) === 30
  })
  await test('order_items com snapshot correto (nome, SKU, preço, price_table_id, min_quantity)', async () => {
    const { data: items } = await svc.from('order_items').select('*').eq('order_id', validOrderId)
    const row = items?.[0]
    return row
      && row.product_name && row.product_sku === 'CHK-P-STD' && row.variant_sku === 'CHK-V-STD'
      && Number(row.unit_price) === 10 && Number(row.total_price) === 30
      && row.price_table_id === U.tableA && row.min_quantity_applied === 1
  })
  await test('carrinho é convertido após checkout válido', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    return cart?.status === 'converted'
  })
  await test('histórico inicial criado exatamente uma vez (status pending)', async () => {
    const { data: hist } = await svc.from('order_status_history').select('*').eq('order_id', validOrderId)
    return hist?.length === 1 && hist[0].status === 'pending'
  })
  await test('reserva de estoque: quantity_reserved aumentado, quantity_available intocado', async () => {
    const { data: inv } = await svc.from('inventories').select('quantity_available, quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    return inv.quantity_available === 100 && inv.quantity_reserved === 13 // 10 (base) + 3
  })

  // ══════════════ CARRINHO VAZIO ══════════════
  section('CARRINHO VAZIO')
  await test('checkout com carrinho vazio → EMPTY_CART', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA)
    return data?.success === false && data?.code === 'EMPTY_CART'
  })
  await test('carrinho já convertido (sem novo item) → EMPTY_CART', async () => {
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA)
    return data?.success === false && data?.code === 'EMPTY_CART'
  })

  // ══════════════ PREÇO ALTERADO ══════════════
  section('PREÇO ALTERADO ENTRE CARRINHO E CHECKOUT')
  await test('checkout usa o preço ATUAL da tabela, não o preço no momento do add', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 2 }) // preço 10 no momento do add
    await svc.from('price_table_products').update({ unit_price: 17 }).eq('price_table_id', U.tableA).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    const key = crypto.randomUUID()
    const { data } = await checkout(C.customerA, key, U.addressA)
    if (data?.success) createdOrders.push(data.order_id)
    await svc.from('price_table_products').update({ unit_price: 10 }).eq('price_table_id', U.tableA).eq('product_id', F.stdP).eq('variant_id', F.stdV)
    return data?.success === true && Number(data.subtotal) === 34 // 17 * 2
  })

  // ══════════════ ITEM INATIVO (rollback) ══════════════
  section('ITEM INATIVO — ROLLBACK')
  await test('produto desativado após add → PRODUCT_UNAVAILABLE, sem pedido parcial', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await svc.from('products').update({ is_active: false }).eq('id', F.stdP)
    const before = await svc.from('orders').select('id', { count: 'exact', head: true })
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA)
    const after = await svc.from('orders').select('id', { count: 'exact', head: true })
    await svc.from('products').update({ is_active: true }).eq('id', F.stdP)
    return data?.code === 'PRODUCT_UNAVAILABLE' && before.count === after.count
  })
  await test('rollback não deixa reserva parcial de estoque', async () => {
    const { data: inv } = await svc.from('inventories').select('quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    // base 10 + 3 (checkout válido) + 2 (preço alterado) + 0 (rollback não reserva) = 15
    return inv.quantity_reserved === 15
  })
  await test('carrinho permanece active após rollback (não convertido)', async () => {
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    return cart?.status === 'active'
  })

  // ══════════════ VARIANTE INVÁLIDA ══════════════
  section('VARIANTE INVÁLIDA')
  await test('variante inativa no momento do checkout → VARIANT_INVALID', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await svc.from('product_variants').update({ is_active: false }).eq('id', F.stdV)
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA)
    await svc.from('product_variants').update({ is_active: true }).eq('id', F.stdV)
    return data?.code === 'VARIANT_INVALID'
  })

  // ══════════════ ESTOQUE INSUFICIENTE / RESERVED CONSIDERADO ══════════════
  section('ESTOQUE INSUFICIENTE')
  await test('estoque insuficiente (available < quantity) → INSUFFICIENT_STOCK, sem pedido', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.lowP, p_variant_id: F.lowV, p_quantity: 1 }) // usable=1, ok no add
    await svc.from('inventories').update({ quantity_available: 5, quantity_reserved: 4 }).eq('product_id', F.lowP).eq('variant_id', F.lowV)
    // Forçar quantidade do item para 2 diretamente (simulando mudança de estoque após o add)
    const cart = await getActiveCart(U.customerA.id, U.companyA.id)
    await svc.from('cart_items').update({ quantity: 2 }).eq('cart_id', cart.id).eq('product_id', F.lowP)
    const before = await svc.from('orders').select('id', { count: 'exact', head: true })
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA)
    const after = await svc.from('orders').select('id', { count: 'exact', head: true })
    return data?.code === 'INSUFFICIENT_STOCK' && data?.available === 1 && before.count === after.count
  })
  await test('reserved é considerado: reserva não muda após a falha', async () => {
    const { data: inv } = await svc.from('inventories').select('quantity_reserved').eq('product_id', F.lowP).eq('variant_id', F.lowV).single()
    return inv.quantity_reserved === 4
  })

  // ══════════════ IDEMPOTÊNCIA E CONCORRÊNCIA ══════════════
  section('IDEMPOTÊNCIA E CONCORRÊNCIA')
  await test('mesma idempotency key duas vezes → mesmo pedido, sem duplicar', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const key = crypto.randomUUID()
    const r1 = await checkout(C.customerA, key, U.addressA)
    const r2 = await checkout(C.customerA, key, U.addressA)
    if (r1.data?.success) createdOrders.push(r1.data.order_id)
    const { count } = await svc.from('orders').select('id', { count: 'exact', head: true }).eq('idempotency_key', key)
    return r1.data?.success === true && r2.data?.success === true && r2.data?.idempotent === true
      && r1.data.order_id === r2.data.order_id && count === 1
  })
  await test('chamadas concorrentes com a mesma key criam apenas UM pedido', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const key = crypto.randomUUID()
    const results = await Promise.all(
      Array.from({ length: 5 }, () => checkout(C.customerA, key, U.addressA)),
    )
    const okOrders = results.map((r) => r.data).filter((d) => d?.success)
    const uniqueOrderIds = new Set(okOrders.map((d) => d.order_id))
    if (okOrders[0]) createdOrders.push(okOrders[0].order_id)
    const { count } = await svc.from('orders').select('id', { count: 'exact', head: true }).eq('idempotency_key', key)
    return okOrders.length === 5 && uniqueOrderIds.size === 1 && count === 1
  })
  await test('concorrência não reserva estoque em duplicidade (reservado sobe só uma vez)', async () => {
    const { data: inv } = await svc.from('inventories').select('quantity_reserved').eq('product_id', F.stdP).eq('variant_id', F.stdV).single()
    // base 15 (checkouts válidos anteriores) + 1 (idempotência simples) + 1 (concorrência, uma única reserva real) = 17
    return inv.quantity_reserved === 17
  })

  // ══════════════ CHECKOUT SELLER BLOQUEADO (12B) ══════════════
  section('CHECKOUT SELLER BLOQUEADO (12B)')
  await test('seller não cria pedido no BLOCO 12B (SELLER_CHECKOUT_NOT_SUPPORTED)', async () => {
    const before = await svc.from('orders').select('id', { count: 'exact', head: true })
    const { data } = await checkout(C.seller, crypto.randomUUID(), U.addressA, U.companyA.id)
    const after = await svc.from('orders').select('id', { count: 'exact', head: true })
    return data?.success === false && data?.code === 'SELLER_CHECKOUT_NOT_SUPPORTED' && before.count === after.count
  })
  await test('seller tentando empresa alheia recebe o mesmo bloqueio (sem checar carteira)', async () => {
    const { data } = await checkout(C.seller, crypto.randomUUID(), U.addressA, U.companyB.id)
    return data?.success === false && data?.code === 'SELLER_CHECKOUT_NOT_SUPPORTED'
  })

  // ══════════════ ISOLAMENTO DE EMPRESA ══════════════
  section('ISOLAMENTO DE EMPRESA')
  await test('customer tentando checkout em outra empresa → FORBIDDEN', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressA, U.companyB.id)
    return data?.success === false && data?.code === 'FORBIDDEN'
  })
  await test('customer pendente/rejeitado é bloqueado no checkout (COMPANY_NOT_ELIGIBLE)', async () => {
    const { data } = await checkout(C.pending, crypto.randomUUID(), U.addressA)
    return data?.code === 'COMPANY_NOT_ELIGIBLE'
  })

  // ══════════════ IDEMPOTENCY KEY — OWNERSHIP CRUZADO ══════════════
  section('IDEMPOTENCY KEY — OWNERSHIP CRUZADO')
  await test('cliente B reutilizando a idempotency_key de A não recebe dados do pedido de A', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const key = crypto.randomUUID()
    const rA = await checkout(C.customerA, key, U.addressA)
    if (rA.data?.success) createdOrders.push(rA.data.order_id)

    await resetCarts(U.customerB.id, U.companyB.id)
    await add(C.customerB, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const rB = await checkout(C.customerB, key, U.addressB)

    const { count } = await svc.from('orders').select('id', { count: 'exact', head: true }).eq('idempotency_key', key)
    const bKeys = Object.keys(rB.data ?? {})
    const noLeak = !bKeys.includes('order_id') && !bKeys.includes('order_number') && !bKeys.includes('total')

    return rA.data?.success === true
      && rB.data?.success === false && rB.data?.code === 'IDEMPOTENCY_KEY_CONFLICT'
      && noLeak && count === 1
  })
  await test('reuso cruzado não gera segunda reserva nem segundo pedido para B', async () => {
    const cartB = await getActiveCart(U.customerB.id, U.companyB.id)
    const { count } = await svc.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', U.companyB.id)
    return cartB?.status === 'active' && count === 0
  })

  // ══════════════ ENDEREÇO — ISOLAMENTO ENTRE EMPRESAS ══════════════
  section('ENDEREÇO — ISOLAMENTO ENTRE EMPRESAS')
  await test('endereço forjado (mesmo profile, company_id de outra empresa) → ADDRESS_NOT_FOUND', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const { data: forged } = await svc.from('addresses').insert({
      profile_id: U.customerA.id, company_id: U.companyB.id, label: 'FORGED',
      zip_code: '00000-000', street: 'X', number: '1', neighborhood: 'Y', city: 'Z', state: 'SP', is_default: false,
    }).select('id').single()
    const { data } = await checkout(C.customerA, crypto.randomUUID(), forged.id)
    await svc.from('addresses').delete().eq('id', forged.id)
    return data?.success === false && data?.code === 'ADDRESS_NOT_FOUND'
  })
  await test('endereço de outro cliente/empresa é rejeitado → ADDRESS_NOT_FOUND', async () => {
    const { data } = await checkout(C.customerA, crypto.randomUUID(), U.addressB)
    return data?.success === false && data?.code === 'ADDRESS_NOT_FOUND'
  })

  // ══════════════ ORDER_NUMBER SOB CONCORRÊNCIA ══════════════
  section('ORDER_NUMBER — UNICIDADE SOB CONCORRÊNCIA')
  await test('checkouts concorrentes de clientes diferentes geram order_numbers distintos', async () => {
    await resetCarts(U.customerA.id, U.companyA.id)
    await resetCarts(U.customerB.id, U.companyB.id)
    await add(C.customerA, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    await add(C.customerB, { p_product_id: F.stdP, p_variant_id: F.stdV, p_quantity: 1 })
    const [rA, rB] = await Promise.all([
      checkout(C.customerA, crypto.randomUUID(), U.addressA),
      checkout(C.customerB, crypto.randomUUID(), U.addressB),
    ])
    if (rA.data?.success) createdOrders.push(rA.data.order_id)
    if (rB.data?.success) createdOrders.push(rB.data.order_id)
    return rA.data?.success === true && rB.data?.success === true
      && rA.data.order_number !== rB.data.order_number
  })

  // ── cleanup ──
  for (const id of createdOrders) await cleanupOrder(id)
  await resetCarts(U.customerA.id, U.companyA.id)
  await resetCarts(U.customerB.id, U.companyB.id)
  const { data: chkProds } = await svc.from('products').select('id').like('sku', 'CHK-P-%')
  if (chkProds?.length) await svc.from('products').delete().in('id', chkProds.map((p) => p.id))
  await svc.from('addresses').delete().eq('id', U.addressA)
  await svc.from('addresses').delete().eq('id', U.addressB)

  console.log(`\n📊 RESULTADO CHECKOUT: ${passed} PASS / ${failed} FAIL (total ${passed + failed})`)
  if (failed > 0) {
    console.log('\nFalhas:')
    for (const f of failures) console.log('  - ' + f)
    process.exit(1)
  }
  console.log('🎉 Todos os testes críticos do checkout passaram.')
}

main().catch((err) => {
  console.error('💥 FALHA GERAL:', err?.message ?? err)
  process.exit(1)
})
