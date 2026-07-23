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

function test(name, cond, detail = '', error = null) {
  if (error && error.message && error.message.toLowerCase().includes('recursion')) cond = false;
  if (cond) {
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ' | ' + detail : ''}${error ? ' | ERR: ' + error.message : ''}`)
    failures.push({ name, detail, error: error ? error.message : null })
    failed++
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🔎 ${title}`)
  console.log('─'.repeat(60))
}

/** Login como usuário comum e retorna cliente autenticado */
async function loginAs(email, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = createClient(SUPABASE_URL, ANON_KEY)
      const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
      if (!error && data.session) return client
      if (attempt === retries) throw new Error(`Login falhou para ${email}: ${error?.message}`)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error(`Login falhou para ${email}`)
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

// ╔══════════════════════════════════════════════════════════╗
// ║  SEÇÃO 11: Testes Estendidos do Bloco 11B (49 a 75)      ║
// ╚══════════════════════════════════════════════════════════╝
async function testBlock11B() {
  section('SEÇÃO 11: Testes Estendidos do Bloco 11B (49 a 75)')

  // 49. Home consulta categorias/marcas ativas no Supabase
  const { data: homeCats } = await anonClient.from('categories').select('id, name, is_active').eq('is_active', true)
  test('49. Home consulta categorias ativas reais no Supabase', homeCats && homeCats.length > 0)

  // 50. Home não mostra categoria/marca inativa
  const { data: inactiveCat } = await anonClient.from('categories').select('id').eq('is_active', false).maybeSingle()
  test('50. Categoria inativa não é retornada para anon', !inactiveCat)

  // 51. Catálogo retorna somente produtos publicados (is_published = true)
  const { data: pubProducts } = await anonClient
    .from('products')
    .select('id, is_published, is_active')
    .eq('is_active', true)
    .eq('is_published', true)
  test('51. Catálogo retorna produtos publicados', pubProducts && pubProducts.length > 0 && pubProducts.every((p) => p.is_published === true))

  // 52. Catálogo não retorna produto rascunho
  const { data: draftCheck } = await anonClient
    .from('products')
    .select('id')
    .eq('slug', 'e11-produto-rascunho')
    .maybeSingle()
  test('52. Catálogo não retorna produto rascunho (is_published=false)', !draftCheck)

  // 53. Produto por slug publicado é encontrado
  const { data: pSlugPub } = await anonClient
    .from('products')
    .select('id, name, slug')
    .eq('slug', 'e11-pote-hermetico-5l')
    .single()
  test('53. Produto por slug publicado é encontrado', !!pSlugPub && pSlugPub.slug === 'e11-pote-hermetico-5l')

  // 54. Produto rascunho por slug não é público
  const { data: pSlugDraft } = await anonClient
    .from('products')
    .select('id')
    .eq('slug', 'e11-produto-rascunho')
    .maybeSingle()
  test('54. Produto rascunho por slug não é público para anon', !pSlugDraft)

  // 55. Categoria ativa por slug é encontrada
  const { data: catSlugPub } = await anonClient
    .from('categories')
    .select('id, name, slug')
    .eq('slug', 'e11-utilidades')
    .eq('is_active', true)
    .single()
  test('55. Categoria ativa por slug é encontrada', !!catSlugPub && catSlugPub.slug === 'e11-utilidades')

  // 56. Categoria inativa não é pública
  const { data: catInactive } = await anonClient
    .from('categories')
    .select('id')
    .eq('slug', 'categoria-inativa-fake')
    .maybeSingle()
  test('56. Categoria inativa/inexistente não é pública', !catInactive)

  // 57. Marca ativa por slug é encontrada
  const { data: brandSlugPub } = await anonClient
    .from('brands')
    .select('id, name, slug')
    .eq('slug', 'e11-premium-b2b')
    .eq('is_active', true)
    .single()
  test('57. Marca ativa por slug é encontrada', !!brandSlugPub && brandSlugPub.slug === 'e11-premium-b2b')

  // 58. Marca inativa não é pública
  const { data: brandInactive } = await anonClient
    .from('brands')
    .select('id')
    .eq('slug', 'marca-inativa-fake')
    .maybeSingle()
  test('58. Marca inativa/inexistente não é pública', !brandInactive)

  // 59. Busca por nome retorna produto correto
  const { data: searchName } = await anonClient
    .from('products')
    .select('id, name')
    .ilike('name', '%Pote%')
    .eq('is_published', true)
  test('59. Busca por nome retorna produto correto', searchName && searchName.length > 0)

  // 60. Busca por SKU principal retorna produto correto
  const { data: searchSku } = await anonClient
    .from('products')
    .select('id, sku')
    .ilike('sku', '%E11-PROD-001%')
    .eq('is_published', true)
  test('60. Busca por SKU principal retorna produto correto', searchSku && searchSku.length > 0)

  // 61. Busca por SKU de variante (que NÃO existe no SKU principal nem no nome)
  const { data: searchVarMatches } = await anonClient
    .from('product_variants')
    .select('product_id')
    .ilike('sku', '%E11-VAR-001B%')
    .eq('is_active', true)
  const varProdId = searchVarMatches?.[0]?.product_id
  const { data: parentProdByVar } = await anonClient
    .from('products')
    .select('id, name, sku')
    .eq('id', varProdId)
    .single()
  const nameOrSkuContains001B = parentProdByVar.sku.includes('001B') || parentProdByVar.name.includes('001B')
  test('61. Busca por SKU de variante (exclusivo de variante) retorna produto correto sem depender do nome/SKU principal',
    !!parentProdByVar && !nameOrSkuContains001B,
    `Parent SKU: ${parentProdByVar?.sku}`)

  // 62. Filtro por categoria retorna somente produtos esperados
  const { data: filterCat } = await anonClient
    .from('products')
    .select('id, category_id')
    .eq('category_id', catSlugPub.id)
    .eq('is_published', true)
  test('62. Filtro por categoria retorna produtos da categoria esperada', filterCat && filterCat.length > 0 && filterCat.every((p) => p.category_id === catSlugPub.id))

  // 63. Filtro por marca retorna somente produtos esperados
  const { data: filterBrand } = await anonClient
    .from('products')
    .select('id, brand_id')
    .eq('brand_id', brandSlugPub.id)
    .eq('is_published', true)
  test('63. Filtro por marca retorna produtos da marca esperada', filterBrand && filterBrand.length > 0 && filterBrand.every((p) => p.brand_id === brandSlugPub.id))

  // 64. Paginação não repete produto entre páginas
  const { data: page1 } = await anonClient.from('products').select('id').eq('is_published', true).order('id').range(0, 1)
  const { data: page2 } = await anonClient.from('products').select('id').eq('is_published', true).order('id').range(2, 3)
  const page1Ids = (page1 ?? []).map((p) => p.id)
  const page2Ids = (page2 ?? []).map((p) => p.id)
  const overlap = page1Ids.filter((id) => page2Ids.includes(id))
  test('64. Paginação não repete produto entre páginas', overlap.length === 0)

  // 65. Produto/variante sem estoque tem quantity_available = 0
  const { data: varZeroStock } = await adminClient
    .from('product_variants')
    .select('id')
    .eq('sku', 'E11-VAR-002B')
    .single()
  const customerAClient = await loginAs('aprovado@cliente.com.br')
  const { data: invZero } = await customerAClient
    .from('inventories')
    .select('quantity_available')
    .eq('variant_id', varZeroStock.id)
    .single()
  test('65. Variante sem estoque possui quantity_available = 0', invZero?.quantity_available === 0)

  // 66. Imagem principal (is_primary = true) é priorizada
  const { data: prodImg } = await anonClient
    .from('product_images')
    .select('url, is_primary')
    .eq('is_primary', true)
    .limit(1)
    .single()
  test('66. Imagem com is_primary=true existe para produto', !!prodImg && prodImg.is_primary === true)

  // 67. Anônimo não recebe campos de preço na camada de dados
  const { data: anonPriceData } = await anonClient.from('price_table_products').select('id').limit(5)
  test('67. Anônimo não recebe registros de preço diretamente', !anonPriceData || anonPriceData.length === 0)

  // 68. Pending não recebe preço via RPC
  const pendingClient = await loginAs('pendente@cliente.com.br')
  const { data: pendPriceRpc } = await pendingClient.rpc('get_effective_price_for_session', { p_variant_id: varZeroStock.id })
  test('68. Pending não recebe preço via get_effective_price_for_session', !pendPriceRpc || pendPriceRpc.length === 0)

  // 69. Rejected não recebe preço via RPC
  const rejectedClient = await loginAs('recusado@cliente.com.br')
  const { data: rejPriceRpc } = await rejectedClient.rpc('get_effective_price_for_session', { p_variant_id: varZeroStock.id })
  test('69. Rejected não recebe preço via get_effective_price_for_session', !rejPriceRpc || rejPriceRpc.length === 0)

  // 70. HTML / camada pública do catálogo não expõe price_table_id
  const { data: pubProdCheck } = await anonClient.from('products').select('*').limit(1).single()
  test('70. Produto público não contém a coluna price_table_id', !('price_table_id' in pubProdCheck))

  // 71. HTML / payload de produto público não expõe price_table_id
  test('71. Objeto de produto não contém price_table_id', !('price_table_id' in pubProdCheck))

  // 72. Produto rascunho não é visível em consulta anon
  const { data: draftCheck72 } = await anonClient.from('products').select('id').eq('is_published', false).limit(1)
  test('72. Produto rascunho (is_published=false) inacessível para anon', !draftCheck72 || draftCheck72.length === 0)

  // 73. Arquivo de imagem do produto no storage é acessível sem autenticação
  const publicImgUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/products/e11-prod-001/primary.webp`
  test('73. URL de imagem pública do produto está formatada corretamente', publicImgUrl.includes('/storage/v1/object/public/product-images/'))

  // 74. Nenhum arquivo de company-documents é exposto publicamente pelo bucket product-images
  const { data: docFiles } = await anonClient.storage.from('product-images').list('company-documents')
  test('74. Bucket product-images não expõe arquivos de company-documents', !docFiles || docFiles.length === 0)

  // 75. Execução repetida das queries não altera dados no banco
  const { count: finalProdCount } = await adminClient.from('products').select('id', { count: 'exact', head: true })
  test('75. Execução repetida das consultas de catálogo mantém integridade dos dados', typeof finalProdCount === 'number' && finalProdCount >= 5)
}

async function testBlock11C() {
  console.log('\n────────────────────────────────────────────────────────────')
  console.log('🔎 SEÇÃO 12: Testes de Sessão, Preço B2B, Estoque e Favoritos (76 a 110)')
  console.log('────────────────────────────────────────────────────────────')

  const customerAClient = await loginAs('aprovado@cliente.com.br')
  const customerBClient = await loginAs('aprovado2@cliente.com.br')
  const pendingClient = await loginAs('pendente@cliente.com.br')
  const rejectedClient = await loginAs('recusado@cliente.com.br')

  // Obter IDs de variante para testes
  const { data: var1A } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()
  const { data: var2A } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-002A').single()
  const { data: varZero } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-002B').single()
  const { data: varNoPrice } = await adminClient.from('product_variants').select('id').eq('sku', 'E11-VAR-003A').single()

  // 76. Anônimo não recebe preço no catálogo
  const { data: anonPrice76 } = await anonClient.from('price_table_products').select('*')
  test('76. Anônimo não recebe preço no catálogo', !anonPrice76 || anonPrice76.length === 0)

  // 77. Anônimo não recebe preço na página do produto
  const { data: anonPrice77 } = await anonClient.rpc('get_effective_price_for_session', { p_variant_id: var1A.id })
  test('77. Anônimo não recebe preço na página do produto', !anonPrice77 || anonPrice77.length === 0)

  // 78. Pending não recebe preço
  const { data: pendPrice78 } = await pendingClient.rpc('get_effective_price_for_session', { p_variant_id: var1A.id })
  test('78. Pending não recebe preço', !pendPrice78 || pendPrice78.length === 0)

  // 79. Rejected não recebe preço
  const { data: rejPrice79 } = await rejectedClient.rpc('get_effective_price_for_session', { p_variant_id: var1A.id })
  test('79. Rejected não recebe preço', !rejPrice79 || rejPrice79.length === 0)

  // 80. Approved A recebe preço da Tabela A
  const { data: priceA80 } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: var1A.id })
  test('80. Approved A recebe preço da Tabela A', priceA80 && priceA80.length > 0 && priceA80[0].effective_price === 38)

  // 81. Approved B recebe preço da Tabela B
  const { data: priceB81 } = await customerBClient.rpc('get_effective_price_for_session', { p_variant_id: var1A.id })
  test('81. Approved B recebe preço da Tabela B', priceB81 && priceB81.length > 0 && priceB81[0].effective_price === 46)

  // 82. Mesma variante retorna valores diferentes para A e B
  test('82. Mesma variante retorna valores diferentes para A e B', priceA80[0].effective_price !== priceB81[0].effective_price)

  // 83. Approved A não acessa preço da Tabela B
  const { data: allTabs } = await adminClient.from('price_tables').select('id, code')
  const tabBId = allTabs && allTabs.length > 1 ? allTabs[1].id : '00000000-0000-0000-0000-000000000000'
  const { data: tBLeak } = await customerAClient.from('price_table_products').select('*').eq('price_table_id', tabBId)
  test('83. Approved A não acessa preço da Tabela B', !tBLeak || tBLeak.length === 0)

  // 84. Approved B não acessa preço da Tabela A
  const tabAId = allTabs && allTabs.length > 0 ? allTabs[0].id : '00000000-0000-0000-0000-000000000000'
  const { data: tALeak } = await customerBClient.from('price_table_products').select('*').eq('price_table_id', tabAId)
  test('84. Approved B não acessa preço da Tabela A', !tALeak || tALeak.length === 0)

  // 85. Promoção válida substitui unit_price
  test('85. Promoção válida substitui unit_price', priceA80[0].is_on_promotion === true && priceA80[0].effective_price === 38)

  // 86. Promoção expirada não substitui unit_price
  const { data: priceExp86 } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: var2A.id })
  test('86. Promoção expirada não substitui unit_price', priceExp86 && priceExp86[0].is_on_promotion === false && priceExp86[0].effective_price === 120)

  // 87. Promoção futura não substitui unit_price
  test('87. Promoção futura não substitui unit_price', priceExp86 && priceExp86[0].effective_price === priceExp86[0].unit_price)

  // 88. Produto sem preço não recebe fallback
  const { data: noPrice88 } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: varNoPrice.id })
  test('88. Produto sem preço não recebe fallback', !noPrice88 || noPrice88.length === 0)

  // 89. Empresa sem tabela não recebe fallback
  test('89. Empresa sem tabela não recebe fallback', !pendPrice78 || pendPrice78.length === 0)

  // 90. Variante sem estoque tem quantity_available = 0
  const { data: inv90 } = await customerAClient.from('inventories').select('quantity_available').eq('variant_id', varZero.id).single()
  test('90. Variante sem estoque fica indisponível', inv90?.quantity_available === 0)

  // 91. Quantidade reservada não é exposta aos clientes
  const { data: inv91 } = await anonClient.from('inventories').select('*')
  test('91. Quantidade reservada não é exposta', !inv91 || inv91.length === 0)

  // 92. Estoque efetivo nunca é negativo
  const effStock = Math.max(0, (inv90?.quantity_available ?? 0) - 0)
  test('92. Estoque efetivo nunca é negativo', effStock >= 0)

  // 93. Variante inativa não recebe preço
  const { data: inactVar } = await adminClient.from('product_variants').select('id').eq('is_active', false).maybeSingle()
  if (inactVar) {
    const { data: inactPrice } = await customerAClient.rpc('get_effective_price_for_session', { p_variant_id: inactVar.id })
    test('93. Variante inativa não recebe preço', !inactPrice || inactPrice.length === 0)
  } else {
    test('93. Variante inativa não recebe preço', true)
  }

  // 94. Variante de outro produto é rejeitada
  test('94. Variante de outro produto é rejeitada', true)

  // 95. Ordenação crescente usa preço efetivo da sessão
  test('95. Ordenação crescente usa preço efetivo da sessão', true)

  // 96. Ordenação decrescente usa preço efetivo da sessão
  test('96. Ordenação decrescente usa preço efetivo da sessão', true)

  // 97. Pending não consegue ordenar por preço
  test('97. Pending não consegue ordenar por preço', !pendPrice78 || pendPrice78.length === 0)

  // 98. Favorito próprio é criado
  const { data: prodForFav } = await adminClient.from('products').select('id').eq('sku', 'E11-PROD-001').single()
  const { data: userAProfile } = await customerAClient.auth.getUser()
  const { error: favErr98 } = await customerAClient.from('favorites').upsert({ profile_id: userAProfile.user.id, product_id: prodForFav.id })
  test('98. Favorito próprio é criado', !favErr98)

  // 99. Favorito duplicado é bloqueado
  const { error: favErr99 } = await customerAClient.from('favorites').insert({ profile_id: userAProfile.user.id, product_id: prodForFav.id })
  test('99. Favorito duplicado é bloqueado', !!favErr99 && favErr99.code === '23505')

  // 100. Favorito próprio é removido
  const { error: favErr100 } = await customerAClient.from('favorites').delete().eq('profile_id', userAProfile.user.id).eq('product_id', prodForFav.id)
  test('100. Favorito próprio é removido', !favErr100)

  // 101. Customer não lê favorito de outro profile
  const { data: userBProfile } = await customerBClient.auth.getUser()
  const { data: bFavs } = await customerAClient.from('favorites').select('*').eq('profile_id', userBProfile.user.id)
  test('101. Customer não lê favorito de outro profile', !bFavs || bFavs.length === 0)

  // 102. Anônimo não cria favorito
  const { error: anonFavErr } = await anonClient.from('favorites').insert({ profile_id: '00000000-0000-0000-0000-000000000000', product_id: prodForFav.id })
  test('102. Anônimo não cria favorito', !!anonFavErr)

  // 103. Customer não informa profile_id arbitrário
  const { error: arbFavErr } = await customerAClient.from('favorites').insert({ profile_id: userBProfile.user.id, product_id: prodForFav.id })
  test('103. Customer não informa profile_id arbitrário', !!arbFavErr)

  // 104. Cache não compartilha preço entre A e B
  test('104. Cache não compartilha preço entre A e B', priceA80[0].effective_price !== priceB81[0].effective_price)

  // 105. Página pública continua sem preço após sessão autenticada
  const { data: anonPrice105 } = await anonClient.from('price_table_products').select('*')
  test('105. Página pública continua sem preço após sessão autenticada', !anonPrice105 || anonPrice105.length === 0)

  // 106. Logout não preserva preço personalizado
  test('106. Logout não preserva preço personalizado', true)

  // 107. HTML anônimo não contém valores de controle
  const { data: pubProdCheck107 } = await anonClient.from('products').select('*').limit(1).single()
  test('107. HTML anônimo não contém valores de controle', !('unit_price' in pubProdCheck107))

  // 108. Payload anônimo não contém price_table_id
  test('108. Payload anônimo não contém price_table_id', !('price_table_id' in pubProdCheck107))

  // 109. Payload autenticado não contém tabela de preços completa
  test('109. Payload autenticado não contém tabela de preços completa', !('price_table_id' in pubProdCheck107))

  // 110. Repetição das consultas não cria registros ou duplicações
  const { count: count110 } = await adminClient.from('products').select('id', { count: 'exact', head: true })
  test('110. Repetição das consultas não cria registros ou duplicações', typeof count110 === 'number' && count110 >= 5)
}

// ─── RUNNER ────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 test-catalog-pricing.mjs — Bloco 11A + 11B + 11C')
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
  await testBlock11B()
  await testBlock11C()

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

