/**
 * scripts/test-catalog-pricing.mjs
 * Suíte de testes do Bloco 11A — Catálogo Real B2B
 * Testa RLS, preços por sessão, estoque e rascunhos contra o Supabase remoto.
 *
 * RESTRIÇÕES:
 * - SUPABASE_SECRET_KEY nunca é enviado ao frontend e nunca representa usuário comum.
 * - Autenticação de usuários comuns usa email/password via signInWithPassword.
 * - Preços são verificados pelo banco via função get_effective_price_for_session.
 * - nenhum companyId ou priceTableId é enviado pelo "navegador" (simulamos sessão real).
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ─── ENV ───────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('💥 .env.local não encontrado')
  process.exit(1)
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SECRET_KEY  = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !ANON_KEY || !SECRET_KEY) {
  console.error('💥 Variáveis de ambiente ausentes.')
  process.exit(1)
}

// Cliente anon (simula navegador público)
const anonClient  = createClient(SUPABASE_URL, ANON_KEY)
// Cliente admin (seed/cleanup — nunca exposto ao navegador)
const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'DevelopmentPassword123!'

// ─── HELPERS ───────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
const failures = []

function test(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ' | ' + detail : ''}`)
    failures.push({ name, detail })
    failed++
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🔎 ${title}`)
  console.log('─'.repeat(60))
}

/** Login como usuário comum e retorna cliente autenticado */
async function loginAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`Login falhou para ${email}: ${error?.message}`)
  return client
}

// ─── CENÁRIOS ──────────────────────────────────────────────────────────────

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 1: Visibilidade pública do catálogo               ║
// ╚══════════════════════════════════════════════════════════╝
async function testPublicCatalogVisibility() {
  section('SEÇÃO 1: Visibilidade pública do catálogo')

  // 1.1 Produto publicado visível para anon
  const { data: published } = await anonClient
    .from('products')
    .select('id, name, is_published, is_active')
    .eq('slug', 'e11-pote-hermetico-5l')
    .maybeSingle()
  test('1.1 Produto publicado visível para anon', !!published, `got: ${JSON.stringify(published)}`)
  test('1.2 Produto retornado está publicado e ativo', published?.is_published === true && published?.is_active === true)

  // 1.3 Produto rascunho NÃO visível para anon
  const { data: draft } = await anonClient
    .from('products')
    .select('id')
    .eq('slug', 'e11-produto-rascunho')
    .maybeSingle()
  test('1.3 Rascunho (is_published=false) oculto para anon', draft === null, `got: ${JSON.stringify(draft)}`)

  // 1.4 Categorias disponíveis para anon
  const { data: cats } = await anonClient
    .from('categories')
    .select('id, slug')
    .eq('slug', 'e11-utilidades')
    .maybeSingle()
  test('1.4 Categoria E11 visível para anon', !!cats)

  // 1.5 Marcas disponíveis para anon
  const { data: brands } = await anonClient
    .from('brands')
    .select('id, slug')
    .eq('slug', 'e11-premium-b2b')
    .maybeSingle()
  test('1.5 Marca E11 visível para anon', !!brands)

  // 1.6 Variantes ativas visíveis para anon
  const { data: variants } = await anonClient
    .from('product_variants')
    .select('id, sku, is_active')
    .eq('sku', 'E11-VAR-001A')
    .maybeSingle()
  test('1.6 Variante ativa visível para anon', !!variants && variants.is_active === true)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 2: Proteção de preços para anon / pending         ║
// ╚══════════════════════════════════════════════════════════╝
async function testPriceProtection() {
  section('SEÇÃO 2: Proteção de preços para anon e pending')

  // 2.1 anon NÃO vê price_table_products
  const { data: anonPrices, error: anonPricesErr } = await anonClient
    .from('price_table_products')
    .select('id, unit_price')
    .limit(5)
  test('2.1 anon não vê price_table_products', (!anonPrices || anonPrices.length === 0), `got ${anonPrices?.length} rows`)

  // 2.2 anon NÃO vê inventários
  const { data: anonInv } = await anonClient
    .from('inventories')
    .select('id')
    .limit(5)
  test('2.2 anon não vê inventários', (!anonInv || anonInv.length === 0), `got ${anonInv?.length} rows`)

  // 2.3 anon NÃO consegue chamar get_effective_price_for_session
  // Busca o ID da variante via admin (não é exposto pelo frontend)
  const { data: varData } = await adminClient
    .from('product_variants')
    .select('id')
    .eq('sku', 'E11-VAR-001A')
    .single()
  const varId = varData?.id
  test('2.3 Variante de controle encontrada', !!varId)

  if (varId) {
    const { data: anonPrice } = await anonClient.rpc('get_effective_price_for_session', { p_variant_id: varId })
    test('2.4 anon não recebe preço de get_effective_price_for_session',
      !anonPrice || anonPrice.length === 0, `got: ${JSON.stringify(anonPrice)}`)
  }

  // 2.5 pending não vê preços
  const pendingClient = await loginAs('pendente@cliente.com.br')
  const { data: pendingPrice } = await pendingClient.rpc('get_effective_price_for_session', { p_variant_id: varId })
  test('2.5 Customer pending não recebe preço', !pendingPrice || pendingPrice.length === 0)

  // 2.6 rejected não vê preços
  const rejectedClient = await loginAs('recusado@cliente.com.br')
  const { data: rejPrice } = await rejectedClient.rpc('get_effective_price_for_session', { p_variant_id: varId })
  test('2.6 Customer rejected não recebe preço', !rejPrice || rejPrice.length === 0)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 3: Preços corretos por tabela (Tabela A)          ║
// ╚══════════════════════════════════════════════════════════╝
async function testPricingTableA() {
  section('SEÇÃO 3: Preços na Tabela A (aprovado@cliente.com.br)')

  const customerAClient = await loginAs('aprovado@cliente.com.br')

  // E11-VAR-001A: R$45,00 normal | R$38,00 promo válida → effective = 38
  const { data: varA } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()
  const { data: priceA } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: varA.id })
  test('3.1 E11-VAR-001A: price encontrado', priceA && priceA.length > 0)
  test('3.2 E11-VAR-001A: unit_price = 45', priceA?.[0]?.unit_price === 45, `got: ${priceA?.[0]?.unit_price}`)
  test('3.3 E11-VAR-001A: promoção ativa → effective = 38', priceA?.[0]?.effective_price === 38, `got: ${priceA?.[0]?.effective_price}`)
  test('3.4 E11-VAR-001A: is_on_promotion = true', priceA?.[0]?.is_on_promotion === true)

  // E11-VAR-001B: R$42,00 normal | sem promo → effective = 42
  const { data: varB } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-001B').single()
  const { data: priceB } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: varB.id })
  test('3.5 E11-VAR-001B: unit_price = 42', priceB?.[0]?.unit_price === 42, `got: ${priceB?.[0]?.unit_price}`)
  test('3.6 E11-VAR-001B: is_on_promotion = false (sem promo)', priceB?.[0]?.is_on_promotion === false)
  test('3.7 E11-VAR-001B: effective_price = 42', priceB?.[0]?.effective_price === 42, `got: ${priceB?.[0]?.effective_price}`)

  // E11-VAR-002A: R$120,00 | promo R$95 EXPIRADA → effective = 120
  const { data: var2A } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-002A').single()
  const { data: price2A } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: var2A.id })
  test('3.8 E11-VAR-002A: unit_price = 120', price2A?.[0]?.unit_price === 120, `got: ${price2A?.[0]?.unit_price}`)
  test('3.9 E11-VAR-002A: promoção expirada → effective = 120 (não 95)', price2A?.[0]?.effective_price === 120, `got: ${price2A?.[0]?.effective_price}`)
  test('3.10 E11-VAR-002A: is_on_promotion = false (expirada)', price2A?.[0]?.is_on_promotion === false)

  // E11-VAR-003A: sem preço → retorna vazio
  const { data: var3A } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-003A').single()
  const { data: price3A } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: var3A.id })
  test('3.11 E11-VAR-003A: sem preço → retorna vazio', !price3A || price3A.length === 0, `got: ${JSON.stringify(price3A)}`)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 4: Preços isolados por tabela (Tabela B vs A)     ║
// ╚══════════════════════════════════════════════════════════╝
async function testPricingTableBIsolation() {
  section('SEÇÃO 4: Isolamento de preços — Tabela B (aprovado2@cliente.com.br)')

  const customerBClient = await loginAs('aprovado2@cliente.com.br')
  const customerAClient = await loginAs('aprovado@cliente.com.br')

  const { data: varA } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()

  // Tabela B: E11-VAR-001A → R$52 normal | R$46 promo válida
  const { data: priceBTab } = await customerBClient.rpc('get_effective_price_for_session', { p_variant_id: varA.id })
  test('4.1 Cliente B recebe preço da Tabela B', priceBTab && priceBTab.length > 0)
  test('4.2 Tabela B: unit_price = 52 (não 45 da Tabela A)', priceBTab?.[0]?.unit_price === 52, `got: ${priceBTab?.[0]?.unit_price}`)
  test('4.3 Tabela B: effective_price = 46 (promo válida)', priceBTab?.[0]?.effective_price === 46, `got: ${priceBTab?.[0]?.effective_price}`)

  // Confirmar que os preços são diferentes entre tabelas
  const { data: priceATab } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: varA.id })
  test('4.4 Preço Tabela A (38) ≠ Preço Tabela B (46)', priceATab?.[0]?.effective_price !== priceBTab?.[0]?.effective_price,
    `A=${priceATab?.[0]?.effective_price}, B=${priceBTab?.[0]?.effective_price}`)

  // 4.5 Cliente B pode ler apenas preços da SUA tabela, não da Tabela A
  // Verificar que os preços retornados pertencem todos à Tabela B (não à Tabela A)
  const { data: rawPtp } = await customerBClient
    .from('price_table_products')
    .select('price_table_id, unit_price')
    .limit(20)
  // Obter o ID da Tabela A (padrão) via admin para comparar
  const { data: tableAData } = await adminClient.from('price_tables').select('id').eq('is_default', true).single()
  const tableAId = tableAData?.id
  // Verificar que NENHUM preço da Tabela A foi retornado para cliente B
  const leakedTableA = rawPtp?.filter((r) => r.price_table_id === tableAId) ?? []
  test('4.5 Cliente B não vê preços da Tabela A (isolamento por tabela)',
    leakedTableA.length === 0,
    `vazamento: ${leakedTableA.length} preços da Tabela A visíveis para Cliente B`)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 5: Estoque                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function testInventory() {
  section('SEÇÃO 5: Estoque')

  const customerAClient = await loginAs('aprovado@cliente.com.br')

  // Só aprovados veem estoque
  const { data: invPublic } = await anonClient.from('inventories').select('id').limit(1)
  test('5.1 anon NÃO vê inventários', !invPublic || invPublic.length === 0)

  const { data: invAuth } = await customerAClient.from('inventories').select('id, quantity_available').limit(1)
  test('5.2 Customer aprovado vê inventários', !!invAuth && invAuth.length > 0)

  // E11-VAR-001A tem 100 unidades
  const { data: var1A } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()
  const { data: inv1A } = await customerAClient
    .from('inventories')
    .select('quantity_available')
    .eq('variant_id', var1A.id)
    .single()
  test('5.3 E11-VAR-001A tem 100 unidades', inv1A?.quantity_available === 100, `got: ${inv1A?.quantity_available}`)

  // E11-VAR-002B tem 0 unidades (sem estoque)
  const { data: var2B } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-002B').single()
  const { data: inv2B } = await customerAClient
    .from('inventories')
    .select('quantity_available')
    .eq('variant_id', var2B.id)
    .single()
  test('5.4 E11-VAR-002B tem 0 unidades (sem estoque)', inv2B?.quantity_available === 0, `got: ${inv2B?.quantity_available}`)

  // Tentativa de estoque negativo via update deve ser bloqueada pela constraint
  const { error: negErr } = await adminClient
    .from('inventories')
    .update({ quantity_available: -1 })
    .eq('variant_id', var2B.id)
  test('5.5 Constraint impede estoque negativo', !!negErr, `error: ${negErr?.message}`)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 6: Integridade — Imagem principal única           ║
// ╚══════════════════════════════════════════════════════════╝
async function testImagePrimaryConstraint() {
  section('SEÇÃO 6: Integridade — Imagem principal única por produto')

  const { data: prod } = await adminClient
    .from('products')
    .select('id')
    .eq('sku', 'E11-PROD-001')
    .single()

  // Tentativa de inserir segunda imagem primária deve falhar
  const { error: dupPrimErr } = await adminClient
    .from('product_images')
    .insert({
      product_id: prod.id,
      url: 'products/e11-prod-001/test-duplicate.webp',
      is_primary: true,
      position: 99,
    })
  test('6.1 Constraint impede segunda imagem is_primary=true', !!dupPrimErr,
    dupPrimErr ? `blocked: ${dupPrimErr.message}` : 'INSERT não falhou!')

  // Imagem não-primária pode ser inserida sem restrição
  const { error: nonPrimErr } = await adminClient
    .from('product_images')
    .insert({
      product_id: prod.id,
      url: 'products/e11-prod-001/secondary.webp',
      is_primary: false,
      position: 1,
    })
  test('6.2 Imagem não-primária pode ser inserida', !nonPrimErr, `error: ${nonPrimErr?.message}`)

  // Cleanup da imagem inserida no teste
  if (!nonPrimErr) {
    await adminClient
      .from('product_images')
      .delete()
      .eq('product_id', prod.id)
      .eq('url', 'products/e11-prod-001/secondary.webp')
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 7: RLS — Admin gerencia, customer não modifica    ║
// ╚══════════════════════════════════════════════════════════╝
async function testAdminRls() {
  section('SEÇÃO 7: RLS — Admin gerencia catálogo, customer não')

  const customerAClient = await loginAs('aprovado@cliente.com.br')

  // Customer não pode inserir produto
  const { error: custInsertProd } = await customerAClient
    .from('products')
    .insert({ sku: 'HACK-PROD', name: 'Hack', slug: 'hack-product', unit: 'UN', min_quantity: 1, multiple_quantity: 1 })
  test('7.1 Customer não pode inserir produto', !!custInsertProd, `error: ${custInsertProd?.message}`)

  // Customer não pode excluir produto — verifica que produto ainda existe após tentativa
  const { data: prod } = await adminClient.from('products').select('id').eq('sku', 'E11-PROD-001').single()
  await customerAClient.from('products').delete().eq('id', prod.id)
  // Confirma que o produto ainda existe no banco (DELETE foi silenciosamente ignorado pelo RLS)
  const { data: prodStillExists } = await adminClient.from('products').select('id').eq('id', prod.id).maybeSingle()
  test('7.2 Customer não pode excluir produto (produto ainda existe após tentativa)', !!prodStillExists,
    prodStillExists ? '' : 'PRODUTO FOI EXCLUÍDO! RLS falhou.')

  // Customer não pode inserir preço
  const { error: custInsertPrice } = await customerAClient
    .from('price_table_products')
    .insert({ price_table_id: '00000000-0000-0000-0000-000000000000', product_id: prod.id, variant_id: '00000000-0000-0000-0000-000000000000', unit_price: 1 })
  test('7.3 Customer não pode inserir preço', !!custInsertPrice, `error: ${custInsertPrice?.message}`)

  // Customer não pode inserir entrada de tabela de preços
  const { error: custInsertPt } = await customerAClient
    .from('price_tables')
    .insert({ name: 'Hack Table', is_default: false, is_active: true })
  test('7.4 Customer não pode inserir tabela de preços', !!custInsertPt, `error: ${custInsertPt?.message}`)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 8: Busca por pg_trgm (nome e SKU)                 ║
// ╚══════════════════════════════════════════════════════════╝
async function testSearch() {
  section('SEÇÃO 8: Busca por similaridade (pg_trgm / ilike)')

  // Busca por nome parcial de produto publicado
  const { data: searchByName } = await anonClient
    .from('products')
    .select('id, name, is_published')
    .ilike('name', '%Pote Herm%')
    .eq('is_published', true)
    .eq('is_active', true)
  test('8.1 Busca ilike por nome parcial retorna produto', searchByName && searchByName.length > 0)
  test('8.2 Produto encontrado está publicado', searchByName?.[0]?.is_published === true)

  // Busca por SKU
  const { data: searchBySku } = await anonClient
    .from('products')
    .select('id, sku')
    .ilike('sku', '%E11-PROD-001%')
    .eq('is_published', true)
  test('8.3 Busca por SKU retorna resultado', searchBySku && searchBySku.length > 0)

  // Rascunho NÃO aparece em busca pública
  const { data: draftSearch } = await anonClient
    .from('products')
    .select('id, is_published')
    .ilike('name', '%Rascunho%')
    .eq('is_active', true)
  test('8.4 Rascunho não aparece em busca pública (is_published=false bloqueado por RLS)',
    !draftSearch || draftSearch.length === 0,
    `got ${draftSearch?.length} rows`)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 9: Favoritos                                      ║
// ╚══════════════════════════════════════════════════════════╝
async function testFavorites() {
  section('SEÇÃO 9: Favoritos')

  const customerAClient = await loginAs('aprovado@cliente.com.br')
  const { data: { user } } = await customerAClient.auth.getUser()
  const userId = user?.id

  const { data: prod } = await adminClient.from('products').select('id').eq('sku', 'E11-PROD-001').single()

  // anon não pode favoritar
  const { error: anonFavErr } = await anonClient
    .from('favorites')
    .insert({ profile_id: '00000000-0000-0000-0000-000000000000', product_id: prod.id })
  test('9.1 anon não pode inserir favorito', !!anonFavErr)

  // Customer aprovado pode inserir favorito para si mesmo
  const { error: favErr } = await customerAClient
    .from('favorites')
    .upsert({ profile_id: userId, product_id: prod.id }, { onConflict: 'profile_id,product_id' })
  test('9.2 Customer aprovado pode inserir favorito', !favErr, `error: ${favErr?.message}`)

  // Customer lê seus próprios favoritos
  const { data: favList } = await customerAClient
    .from('favorites')
    .select('product_id')
    .eq('profile_id', userId)
  test('9.3 Customer lê seus favoritos', favList && favList.length > 0)

  // Cleanup
  await customerAClient.from('favorites').delete().eq('profile_id', userId).eq('product_id', prod.id)
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 10: inventory_movements (nova tabela)             ║
// ╚══════════════════════════════════════════════════════════╝
async function testInventoryMovements() {
  section('SEÇÃO 10: Tabela inventory_movements')

  // anon não lê movimentos
  const { data: anonMov } = await anonClient.from('inventory_movements').select('id').limit(1)
  test('10.1 anon não lê inventory_movements', !anonMov || anonMov.length === 0)

  // Customer não lê movimentos
  const customerAClient = await loginAs('aprovado@cliente.com.br')
  const { data: custMov } = await customerAClient.from('inventory_movements').select('id').limit(1)
  test('10.2 Customer não lê inventory_movements', !custMov || custMov.length === 0)
}

// ─── RUNNER ────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 test-catalog-pricing.mjs — Bloco 11A')
  console.log(`   URL: ${new URL(SUPABASE_URL).hostname}`)
  console.log(`   Início: ${new Date().toISOString()}`)

  await testPublicCatalogVisibility()
  await testPriceProtection()
  await testPricingTableA()
  await testPricingTableBIsolation()
  await testInventory()
  await testImagePrimaryConstraint()
  await testAdminRls()
  await testSearch()
  await testFavorites()
  await testInventoryMovements()

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📊 RESULTADO FINAL`)
  console.log(`   ✅ Aprovados: ${passed}`)
  console.log(`   ❌ Reprovados: ${failed}`)
  console.log(`   Total: ${passed + failed}`)

  if (failures.length > 0) {
    console.log('\n🔴 FALHAS:')
    for (const f of failures) {
      console.log(`   • ${f.name}${f.detail ? ' → ' + f.detail : ''}`)
    }
  }

  console.log(`${'═'.repeat(60)}\n`)

  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('💥 Erro inesperado:', err.message)
  process.exit(1)
})
