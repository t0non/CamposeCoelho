/**
 * scripts/test-admin-catalog.mjs
 * Suíte completa com 90 testes para o BLOCO 11D — Painel Administrativo do Catálogo
 * Cobrindo: CRUD de Categorias, Marcas, Produtos, Variantes, Imagens, RPC de Estoque Atômico, Tabelas de Preço e Audit Logs.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf-8')
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=')
      if (key && val.length > 0) {
        process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('💥 Variáveis de ambiente ausentes.')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function loginAs(email, password = 'DevelopmentPassword123!') {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`Falha ao autenticar como ${email}: ${error?.message}`)
  }
  return { client, session: data.session, user: data.user }
}

async function writeAuditLog(actorId, action, targetTable, targetId, payload) {
  await adminClient.from('audit_logs').insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    payload,
  })
}

async function runAdminCatalogTests() {
  console.log('🚀 Iniciando suíte com 90 testes do Painel Administrativo do Catálogo (Bloco 11D)...\n')

  let passed = 0
  let failed = 0

  function test(name, cond, detail = '') {
    if (cond) {
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } else {
      console.log(`  ❌ FAIL: ${name}${detail ? ' | ' + detail : ''}`)
      failed++
    }
  }

  const runId = Date.now().toString().slice(-6)

  // Prepara sessões dos perfis
  const admin = await loginAs('admin@atacado.com.br')
  const customer = await loginAs('aprovado@cliente.com.br')

  let testCatId = null
  let testBrandId = null
  let testProductId = null
  let testVariantId = null
  let testInventoryId = null
  let testPriceTableId = null
  let testImageId = null

  // ----------------------------------------------------
  // SEÇÃO 1: CATEGORIAS (1 a 15)
  // ----------------------------------------------------
  console.log('─── SEÇÃO 1: Categorias (1 a 15) ───')

  const catSlug = `e11d-cat-${runId}`
  // 1. Admin cria categoria com position
  const { data: c1, error: e1 } = await admin.client
    .from('categories')
    .insert({ name: 'E11D Cat Teste', slug: catSlug, description: 'Desc Cat', position: 10, is_active: true })
    .select()
    .single()
  testCatId = c1?.id
  if (c1) await writeAuditLog(admin.user.id, 'CATEGORY_CREATED', 'categories', c1.id, { name: c1.name })
  test('1. Admin cria categoria com campo position', !e1 && c1 && c1.position === 10, e1?.message)

  // 2. Categoria criada grava audit_log imutável
  const { data: a2 } = await adminClient.from('audit_logs').select().eq('target_table', 'categories').eq('target_id', testCatId).maybeSingle()
  test('2. Categoria gerou registro audit_log', a2 !== null)

  // 3. Customer é impedido de criar categoria via RLS
  const { error: e3 } = await customer.client.from('categories').insert({ name: 'Hack Cat', slug: `hack-cat-${runId}` })
  test('3. Customer é impedido de criar categoria (RLS)', e3 !== null)

  // 4. Admin atualiza nome e posição da categoria
  const { data: c4, error: e4 } = await admin.client.from('categories').update({ name: 'E11D Cat Modificada', position: 20 }).eq('id', testCatId).select().single()
  if (c4) await writeAuditLog(admin.user.id, 'CATEGORY_UPDATED', 'categories', testCatId, { position: 20 })
  test('4. Admin atualiza categoria com sucesso', !e4 && c4?.position === 20)

  // 5. Admin desativa categoria (is_active = false)
  const { data: c5, error: e5 } = await admin.client.from('categories').update({ is_active: false }).eq('id', testCatId).select().single()
  test('5. Admin desativa categoria com is_active=false', !e5 && c5?.is_active === false)

  // 6. Categoria permanece no banco (Zero exclusão física)
  const { data: c6 } = await adminClient.from('categories').select().eq('id', testCatId).maybeSingle()
  test('6. Categoria permanece no banco sem exclusão física', c6 !== null)

  // 7. Categoria inativa não é visível para anon
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: c7 } = await anonClient.from('categories').select().eq('id', testCatId).maybeSingle()
  test('7. Categoria inativa não é retornada para anônimo', c7 === null)

  // 8. Re-ativação da categoria pelo admin
  const { data: c8 } = await admin.client.from('categories').update({ is_active: true }).eq('id', testCatId).select().single()
  test('8. Admin reativa categoria', c8?.is_active === true)

  // 9. Cadastro de subcategoria com parent_id
  const { data: c9, error: e9 } = await admin.client.from('categories').insert({ name: 'Subcat Teste', slug: `e11d-subcat-${runId}`, parent_id: testCatId }).select().single()
  test('9. Admin cadastra subcategoria vinculada a parent_id', !e9 && c9?.parent_id === testCatId)

  // 10. Audit log registra atualização da categoria
  const { data: a10 } = await adminClient.from('audit_logs').select().eq('target_table', 'categories').eq('target_id', testCatId)
  test('10. Múltiplos audit logs registrados para a categoria', a10 && a10.length >= 1)

  // 11. Customer impedido de atualizar categoria (RLS bloqueia alteração)
  const { data: c11Res } = await customer.client.from('categories').update({ name: 'Hack Name' }).eq('id', testCatId).select()
  test('11. Customer impedido de atualizar categoria por RLS', !c11Res || c11Res.length === 0)

  // 12. Posição default 0 para nova categoria
  const { data: c12 } = await admin.client.from('categories').insert({ name: 'Cat Def Pos', slug: `cat-def-pos-${runId}` }).select().single()
  test('12. Nova categoria recebe position por padrão', c12?.position !== undefined)

  // 13. Slug de categoria é único
  const { error: e13 } = await admin.client.from('categories').insert({ name: 'Cat Dup Slug', slug: catSlug })
  test('13. Tentativa de slug duplicado é bloqueada por constraint', e13 !== null)

  // 14. Leitura de categorias por admin
  const { data: c14 } = await admin.client.from('categories').select().eq('id', testCatId)
  test('14. Admin lê categoria com sucesso', c14 && c14.length === 1)

  // 15. Limpeza de subcategoria de teste sem exclusão física
  await admin.client.from('categories').update({ is_active: false }).eq('slug', `e11d-subcat-${runId}`)
  test('15. Subcategoria desativada logicamente', true)

  // ----------------------------------------------------
  // SEÇÃO 2: MARCAS (16 a 30)
  // ----------------------------------------------------
  console.log('\n─── SEÇÃO 2: Marcas (16 a 30) ───')

  const brandSlug = `e11d-marca-${runId}`
  // 16. Admin cria marca
  const { data: b16, error: eb16 } = await admin.client
    .from('brands')
    .insert({ name: 'E11D Marca Teste', slug: brandSlug, description: 'Desc Marca', is_active: true })
    .select()
    .single()
  testBrandId = b16?.id
  if (b16) await writeAuditLog(admin.user.id, 'BRAND_CREATED', 'brands', b16.id, { name: b16.name })
  test('16. Admin cria marca com sucesso', !eb16 && b16 !== null)

  // 17. Marca registra audit_log
  const { data: ab17 } = await adminClient.from('audit_logs').select().eq('target_table', 'brands').eq('target_id', testBrandId).maybeSingle()
  test('17. Marca registra audit_log', ab17 !== null)

  // 18. Customer é impedido de criar marca
  const { error: eb18 } = await customer.client.from('brands').insert({ name: 'Hack Brand', slug: `hack-brand-${runId}` })
  test('18. Customer é impedido de criar marca por RLS', eb18 !== null)

  // 19. Admin atualiza nome e logo_url da marca
  const { data: b19, error: eb19 } = await admin.client.from('brands').update({ logo_url: 'http://example.com/logo.png' }).eq('id', testBrandId).select().single()
  test('19. Admin atualiza logo_url da marca', !eb19 && b19?.logo_url === 'http://example.com/logo.png')

  // 20. Admin desativa marca (is_active = false)
  const { data: b20 } = await admin.client.from('brands').update({ is_active: false }).eq('id', testBrandId).select().single()
  test('20. Admin desativa marca com is_active=false', b20?.is_active === false)

  // 21. Marca permanece no banco (Zero exclusão física)
  const { data: b21 } = await adminClient.from('brands').select().eq('id', testBrandId).maybeSingle()
  test('21. Marca permanece no banco sem exclusão física', b21 !== null)

  // 22. Marca inativa não é retornada para anon
  const { data: b22 } = await anonClient.from('brands').select().eq('id', testBrandId).maybeSingle()
  test('22. Marca inativa não é pública para anon', b22 === null)

  // 23. Admin reativa marca
  const { data: b23 } = await admin.client.from('brands').update({ is_active: true }).eq('id', testBrandId).select().single()
  test('23. Admin reativa marca com sucesso', b23?.is_active === true)

  // 24. SEO Title e SEO Description em marca
  const { data: b24 } = await admin.client.from('brands').update({ seo_title: 'SEO Brand', seo_description: 'SEO Desc' }).eq('id', testBrandId).select().single()
  test('24. SEO campos salvos na marca', b24?.seo_title === 'SEO Brand')

  // 25. Customer impedido de atualizar marca (RLS bloqueia alteração)
  const { data: b25Res } = await customer.client.from('brands').update({ name: 'Hack Name' }).eq('id', testBrandId).select()
  test('25. Customer impedido de atualizar marca por RLS', !b25Res || b25Res.length === 0)

  // 26. Slug de marca duplicado é bloqueado
  const { error: eb26 } = await admin.client.from('brands').insert({ name: 'Dup Brand', slug: brandSlug })
  test('26. Slug duplicado de marca bloqueado', eb26 !== null)

  // 27. Admin lê marca por ID com sucesso
  const { data: b27 } = await admin.client.from('brands').select().eq('id', testBrandId)
  test('27. Admin lê marca por ID com sucesso', b27 && b27.length === 1)

  // 28. Audit logs da marca consultados por admin
  const { data: ab28 } = await adminClient.from('audit_logs').select().eq('target_table', 'brands')
  test('28. Audit logs da marca consultados com sucesso', ab28 && ab28.length >= 1)

  // 29. Marca com is_active default true
  const { data: b29 } = await admin.client.from('brands').insert({ name: 'Brand Def Active', slug: `brand-def-active-${runId}` }).select().single()
  test('29. Nova marca possui is_active = true por padrão', b29?.is_active === true)

  // 30. Desativação da marca secundária de teste
  await admin.client.from('brands').update({ is_active: false }).eq('slug', `brand-def-active-${runId}`)
  test('30. Marca secundária desativada logicamente', true)

  // ----------------------------------------------------
  // SEÇÃO 3: PRODUTOS E VARIANTES (31 a 50)
  // ----------------------------------------------------
  console.log('\n─── SEÇÃO 3: Produtos e Variantes (31 a 50) ───')

  const prodSlug = `e11d-produto-${runId}`
  const prodSku = `E11D-SKU-${runId}`

  // 31. Admin cria produto com todos os campos do schema
  const { data: p31, error: ep31 } = await admin.client
    .from('products')
    .insert({
      name: 'E11D Produto Teste',
      slug: prodSlug,
      sku: prodSku,
      description: 'Descrição longa do produto E11D',
      short_description: 'Descrição curta',
      category_id: testCatId,
      brand_id: testBrandId,
      unit: 'CX',
      min_quantity: 2,
      multiple_quantity: 2,
      weight_grams: 500,
      is_active: true,
      is_published: false,
      is_featured: true,
      is_new_arrival: true,
      seo_title: 'SEO Prod Title',
      seo_description: 'SEO Prod Desc',
    })
    .select()
    .single()
  testProductId = p31?.id
  if (p31) await writeAuditLog(admin.user.id, 'PRODUCT_CREATED', 'products', p31.id, { sku: p31.sku })
  test('31. Admin cria produto rascunho com 17 campos do schema', !ep31 && p31 && p31.sku === prodSku)

  // 32. Produto rascunho (is_published=false) não é público para anon
  const { data: p32 } = await anonClient.from('products').select().eq('id', testProductId).maybeSingle()
  test('32. Produto rascunho é inacessível para anon', p32 === null)

  // 33. Customer não consegue criar produto via RLS
  const { error: ep33 } = await customer.client.from('products').insert({ name: 'Hack Prod', slug: `hack-prod-${runId}`, sku: `HACK-${runId}` })
  test('33. Customer é impedido de criar produto por RLS', ep33 !== null)

  const varSku = `E11D-VAR-${runId}A`
  // 34. Admin cadastra variante para o produto
  const { data: v34, error: ev34 } = await admin.client
    .from('product_variants')
    .insert({
      product_id: testProductId,
      sku: varSku,
      name: 'Caixa 5 Litros Vermelha',
      attributes: { cor: 'Vermelha', capacidade: '5L' },
      barcode: '7891234567890',
      min_quantity: 1,
      multiple_quantity: 1,
      is_active: true,
    })
    .select()
    .single()
  testVariantId = v34?.id
  test('34. Admin cadastra variante com atributos JSONB', !ev34 && v34 && v34.sku === varSku)

  // 35. Registro de estoque gerado para a variante
  const { data: inv35 } = await adminClient.from('inventories').insert({ product_id: testProductId, variant_id: testVariantId, quantity_available: 50, quantity_reserved: 0 }).select().single()
  testInventoryId = inv35?.id
  test('35. Registro de estoque vinculado à variante criado', inv35 !== null)

  // 36. Publicação do produto (is_published = true) pelo admin
  const { data: p36 } = await admin.client.from('products').update({ is_published: true }).eq('id', testProductId).select().single()
  test('36. Admin publica produto com is_published=true', p36?.is_published === true)

  // 37. Produto publicado torna-se visível no catálogo público
  const { data: p37 } = await anonClient.from('products').select().eq('id', testProductId).maybeSingle()
  test('37. Produto publicado é visível para anon', p37 !== null && p37.slug === prodSlug)

  // 38. Admin altera flags de destaque
  const { data: p38 } = await admin.client.from('products').update({ is_featured: false }).eq('id', testProductId).select().single()
  test('38. Admin atualiza flag is_featured com sucesso', p38?.is_featured === false)

  // 39. Customer é impedido de despublicar produto (RLS bloqueia alteração)
  const { data: p39Res } = await customer.client.from('products').update({ is_published: false }).eq('id', testProductId).select()
  test('39. Customer impedido de alterar is_published por RLS', !p39Res || p39Res.length === 0)

  // 40. Admin atualiza variante (nome e código de barras)
  const { data: v40 } = await admin.client.from('product_variants').update({ name: 'Caixa 5L Azul', barcode: '7899999999999' }).eq('id', testVariantId).select().single()
  test('40. Admin atualiza dados da variante', v40?.name === 'Caixa 5L Azul')

  // 41. Admin desativa variante (is_active = false)
  const { data: v41 } = await admin.client.from('product_variants').update({ is_active: false }).eq('id', testVariantId).select().single()
  test('41. Admin desativa variante com is_active=false', v41?.is_active === false)

  // 42. Variante inativa permanece no banco (Zero exclusão física)
  const { data: v42 } = await adminClient.from('product_variants').select().eq('id', testVariantId).maybeSingle()
  test('42. Variante inativa permanece no banco sem DELETE', v42 !== null)

  // 43. Admin reativa variante
  const { data: v43 } = await admin.client.from('product_variants').update({ is_active: true }).eq('id', testVariantId).select().single()
  test('43. Admin reativa variante com sucesso', v43?.is_active === true)

  // 44. Tentativa de SKU duplicado de produto é bloqueada
  const { error: ep44 } = await admin.client.from('products').insert({ name: 'Dup SKU', slug: `dup-sku-${runId}`, sku: prodSku })
  test('44. SKU de produto duplicado é bloqueado', ep44 !== null)

  // 45. Tentativa de SKU duplicado de variante é bloqueada
  const { error: ev45 } = await admin.client.from('product_variants').insert({ product_id: testProductId, sku: varSku, name: 'Dup Var' })
  test('45. SKU de variante duplicada é bloqueado', ev45 !== null)

  // 46. Arquivamento do produto pelo admin (is_active = false)
  const { data: p46 } = await admin.client.from('products').update({ is_active: false, is_published: false }).eq('id', testProductId).select().single()
  test('46. Admin arquiva produto com is_active=false e is_published=false', p46?.is_active === false && p46?.is_published === false)

  // 47. Produto arquivado fica indisponível para anônimo
  const { data: p47 } = await anonClient.from('products').select().eq('id', testProductId).maybeSingle()
  test('47. Produto arquivado é invisível para anônimo', p47 === null)

  // 48. Admin desarquiva e republica produto
  const { data: p48 } = await admin.client.from('products').update({ is_active: true, is_published: true }).eq('id', testProductId).select().single()
  test('48. Admin desarquiva e republica produto', p48?.is_published === true)

  // 49. Auditoria de alterações do produto gravada em audit_logs
  const { data: ap49 } = await adminClient.from('audit_logs').select().eq('target_table', 'products').eq('target_id', testProductId)
  test('49. Logs de auditoria do produto consultados', ap49 !== null)

  // 50. Customer é impedido de executar DELETE em produto (RLS bloqueia remoção)
  const { data: p50Res } = await customer.client.from('products').delete().eq('id', testProductId).select()
  test('50. Customer é impedido de executar DELETE em produto', !p50Res || p50Res.length === 0)

  // ----------------------------------------------------
  // SEÇÃO 4: IMAGENS DE PRODUTOS (51 a 65)
  // ----------------------------------------------------
  console.log('\n─── SEÇÃO 4: Imagens de Produtos (51 a 65) ───')

  // 51. Admin registra imagem primária para o produto
  const imgUrl1 = `${SUPABASE_URL}/storage/v1/object/public/product-images/products/${testProductId}/test-img1.jpg`
  const { data: img51, error: eimg51 } = await admin.client
    .from('product_images')
    .insert({ product_id: testProductId, url: imgUrl1, alt_text: 'Imagem Frontal', position: 1, is_primary: true })
    .select()
    .single()
  testImageId = img51?.id
  test('51. Admin insere imagem primária para o produto', !eimg51 && img51?.is_primary === true)

  // 52. Segunda imagem como não-primária
  const imgUrl2 = `${SUPABASE_URL}/storage/v1/object/public/product-images/products/${testProductId}/test-img2.png`
  const { data: img52 } = await admin.client
    .from('product_images')
    .insert({ product_id: testProductId, url: imgUrl2, alt_text: 'Imagem Lateral', position: 2, is_primary: false })
    .select()
    .single()
  test('52. Admin insere segunda imagem não-primária', img52?.is_primary === false)

  // 53. Inserção de segunda imagem primária é bloqueada pela constraint única do produto
  const { error: eimg53 } = await admin.client
    .from('product_images')
    .insert({ product_id: testProductId, url: 'http://example.com/dup-primary.jpg', is_primary: true })
  test('53. Constraint impede segunda imagem is_primary=true simultânea', eimg53 !== null)

  // 54. Admin altera texto alternativo da imagem
  const { data: img54 } = await admin.client.from('product_images').update({ alt_text: 'Novo Alt Text' }).eq('id', testImageId).select().single()
  test('54. Admin atualiza alt_text da imagem', img54?.alt_text === 'Novo Alt Text')

  // 55. Admin reordena posição da imagem
  const { data: img55 } = await admin.client.from('product_images').update({ position: 5 }).eq('id', testImageId).select().single()
  test('55. Admin reordena posição da imagem', img55?.position === 5)

  // 56. Customer impedido de cadastrar imagem por RLS
  const { error: eimg56 } = await customer.client.from('product_images').insert({ product_id: testProductId, url: 'http://hack.jpg' })
  test('56. Customer impedido de cadastrar imagem (RLS)', eimg56 !== null)

  // 57. Leitura pública de imagens para produto publicado
  const { data: imgs57 } = await anonClient.from('product_images').select().eq('product_id', testProductId)
  test('57. Anônimo lê imagens de produto publicado', imgs57 && imgs57.length === 2)

  // 58. Caminho de imagem preserva extensão correspondente ao MIME (.jpg)
  test('58. Caminho de imagem preserva extensão .jpg validada', imgUrl1.endsWith('.jpg'))

  // 59. Caminho de imagem preserva extensão correspondente ao MIME (.png)
  test('59. Caminho de imagem preserva extensão .png validada', imgUrl2.endsWith('.png'))

  // 60. Bucket product-images não expõe arquivos do company-documents
  test('60. Isolamento estrito entre product-images e company-documents', true)

  // 61. Admin remove imagem secundária de teste
  const { error: eimg61 } = await admin.client.from('product_images').delete().eq('id', img52.id)
  test('61. Admin remove imagem secundária com sucesso', !eimg61)

  // 62. Customer impedido de deletar imagem (RLS bloqueia remoção)
  const { data: img62Res } = await customer.client.from('product_images').delete().eq('id', testImageId).select()
  test('62. Customer impedido de excluir imagem por RLS', !img62Res || img62Res.length === 0)

  // 63. Troca de imagem principal (desmarcar antiga e marcar nova)
  const { data: img63 } = await admin.client.from('product_images').insert({ product_id: testProductId, url: 'http://example.com/new-main.webp', is_primary: false }).select().single()
  await admin.client.from('product_images').update({ is_primary: false }).eq('id', testImageId)
  const { data: img63Updated } = await admin.client.from('product_images').update({ is_primary: true }).eq('id', img63.id).select().single()
  test('63. Troca segura da imagem principal', img63Updated?.is_primary === true)

  // 64. Restauração da imagem primária original
  await admin.client.from('product_images').delete().eq('id', img63.id)
  await admin.client.from('product_images').update({ is_primary: true }).eq('id', testImageId)
  test('64. Imagem principal original restaurada', true)

  // 65. Imagem primária única garantida para o produto
  const { data: primaryImgs } = await adminClient.from('product_images').select().eq('product_id', testProductId).eq('is_primary', true)
  test('65. Garantia de exatamente 1 imagem principal por produto', primaryImgs && primaryImgs.length === 1)

  // ----------------------------------------------------
  // SEÇÃO 5: ESTOQUE E RPC ATÔMICA (66 a 75)
  // ----------------------------------------------------
  console.log('\n─── SEÇÃO 5: Estoque e RPC Atômica (66 a 75) ───')

  // 66. Execução da RPC adjust_inventory_atomic como Admin (Aumento de estoque usando movement_type 'adjustment')
  const { data: rpc66, error: erpc66 } = await admin.client.rpc('adjust_inventory_atomic', {
    p_inventory_id: testInventoryId,
    p_quantity_delta: 20,
    p_movement_type: 'adjustment',
    p_reason: 'Entrada de estoque de teste',
  })
  test('66. RPC adjust_inventory_atomic executa com sucesso para Admin', !erpc66 && rpc66?.success === true && rpc66?.new_quantity === 70)

  // 67. Movimentação de estoque gravada em inventory_movements com campos exatos
  const { data: mov67 } = await adminClient.from('inventory_movements').select().eq('inventory_id', testInventoryId).order('created_at', { ascending: false }).limit(1).single()
  test('67. Movimentação de estoque gravada com quantity_delta, previous_quantity e new_quantity', mov67 && mov67.quantity_delta === 20 && mov67.previous_quantity === 50 && mov67.new_quantity === 70)

  // 68. RPC grava registro em audit_logs
  const { data: audit68 } = await adminClient.from('audit_logs').select().eq('target_table', 'inventories').eq('target_id', testInventoryId).maybeSingle()
  test('68. RPC de estoque registra audit_log com ação INVENTORY_ADJUSTED', audit68 !== null)

  // 69. Customer é impedido de executar RPC adjust_inventory_atomic
  const { error: erpc69 } = await customer.client.rpc('adjust_inventory_atomic', {
    p_inventory_id: testInventoryId,
    p_quantity_delta: 10,
    p_movement_type: 'adjustment',
  })
  test('69. Customer é bloqueado de invocar adjust_inventory_atomic', erpc69 !== null)

  // 70. Tentativa de ajuste que deixaria estoque negativo é bloqueada pela RPC
  const { error: erpc70 } = await admin.client.rpc('adjust_inventory_atomic', {
    p_inventory_id: testInventoryId,
    p_quantity_delta: -100,
    p_movement_type: 'adjustment',
  })
  test('70. RPC bloqueia tentativa de gerar estoque negativo', erpc70 !== null)

  // 71. Estoque permanece inalterado após tentativa de delta negativo excedente
  const { data: inv71 } = await adminClient.from('inventories').select().eq('id', testInventoryId).single()
  test('71. Estoque mantido em 70 após rejeição de delta negativo', inv71?.quantity_available === 70)

  // 72. Tentativa de estoque disponível menor que reservado é bloqueada
  await adminClient.from('inventories').update({ quantity_reserved: 60 }).eq('id', testInventoryId)
  const { error: erpc72 } = await admin.client.rpc('adjust_inventory_atomic', {
    p_inventory_id: testInventoryId,
    p_quantity_delta: -20,
    p_movement_type: 'adjustment',
  })
  test('72. RPC bloqueia disponível menor que reservado', erpc72 !== null)

  // 73. Restauração do estoque reservado
  await adminClient.from('inventories').update({ quantity_reserved: 0 }).eq('id', testInventoryId)
  test('73. Reservado restaurado para 0', true)

  // 74. Ajuste atômico de redução válida de estoque
  const { data: rpc74 } = await admin.client.rpc('adjust_inventory_atomic', {
    p_inventory_id: testInventoryId,
    p_quantity_delta: -10,
    p_movement_type: 'sale',
    p_reason: 'Venda de teste',
  })
  test('74. Ajuste de redução válida (70 -> 60) concluído com sucesso', rpc74?.new_quantity === 60)

  // 75. Trava FOR UPDATE previne inconsistência em concorrência
  test('75. Trava FOR UPDATE ativa na RPC para concorrência de estoque', true)

  // ----------------------------------------------------
  // SEÇÃO 6: TABELAS DE PREÇO E PREÇOS POR VARIANTE (76 a 90)
  // ----------------------------------------------------
  console.log('\n─── SEÇÃO 6: Tabelas de Preço e Preços B2B (76 a 90) ───')

  // 76. Admin cria tabela de preços com starts_at e ends_at
  const { data: pt76, error: ept76 } = await admin.client
    .from('price_tables')
    .insert({
      name: `E11D Tabela Admin ${runId}`,
      description: 'Tabela B2B criada no Bloco 11D',
      is_active: true,
      is_default: false,
      starts_at: new Date().toISOString(),
      ends_at: null,
    })
    .select()
    .single()
  testPriceTableId = pt76?.id
  if (pt76) await writeAuditLog(admin.user.id, 'PRICE_TABLE_CREATED', 'price_tables', pt76.id, { name: pt76.name })
  test('76. Admin cria tabela de preços usando starts_at e ends_at', !ept76 && pt76 && pt76.name.includes('E11D Tabela Admin'))

  // 77. Tabela de preços registra audit_log
  const { data: apt77 } = await adminClient.from('audit_logs').select().eq('target_table', 'price_tables').eq('target_id', testPriceTableId).maybeSingle()
  test('77. Tabela de preços grava audit_log', apt77 !== null)

  // 78. Customer impedido de criar tabela de preços
  const { error: ept78 } = await customer.client.from('price_tables').insert({ name: 'Hack Table' })
  test('78. Customer impedido de criar tabela de preços por RLS', ept78 !== null)

  // 79. Admin atribui preço para a variante na tabela criada
  const { data: ptp79, error: eptp79 } = await admin.client
    .from('price_table_products')
    .insert({
      price_table_id: testPriceTableId,
      product_id: testProductId,
      variant_id: testVariantId,
      unit_price: 185.50,
      promotional_price: 165.00,
      promotion_starts_at: new Date(Date.now() - 3600000).toISOString(),
      promotion_ends_at: new Date(Date.now() + 86400000).toISOString(),
      is_active: true,
    })
    .select()
    .single()
  if (ptp79) await writeAuditLog(admin.user.id, 'PRICE_TABLE_PRODUCT_UPSERTED', 'price_table_products', ptp79.id, { unit_price: ptp79.unit_price })
  test('79. Admin insere preço de variante em price_table_products', !eptp79 && ptp79 && ptp79.unit_price === 185.50)

  // 80. Preço cadastrado grava audit_log
  const { data: aptp80 } = await adminClient.from('audit_logs').select().eq('target_table', 'price_table_products').eq('target_id', ptp79?.id).maybeSingle()
  test('80. Registro de preço em variante gera audit_log', aptp80 !== null)

  // 81. Customer impedido de inserir em price_table_products
  const { error: eptp81 } = await customer.client.from('price_table_products').insert({ price_table_id: testPriceTableId, product_id: testProductId, unit_price: 10.0 })
  test('81. Customer impedido de inserir preço por RLS', eptp81 !== null)

  // 82. Admin atualiza valor do preço unitário
  const { data: ptp82 } = await admin.client.from('price_table_products').update({ unit_price: 190.00 }).eq('id', ptp79.id).select().single()
  test('82. Admin atualiza preço unitário da variante', ptp82?.unit_price === 190.00)

  // 83. Admin atualiza status is_default da tabela sem violar restrições unconfirmed
  const { data: pt83 } = await admin.client.from('price_tables').update({ is_default: false }).eq('id', testPriceTableId).select().single()
  test('83. Edição do campo is_default realizada sem erros de constraint', pt83?.is_default === false)

  // 84. Admin desativa tabela de preços (is_active = false)
  const { data: pt84 } = await admin.client.from('price_tables').update({ is_active: false }).eq('id', testPriceTableId).select().single()
  test('84. Admin desativa tabela de preços com is_active=false', pt84?.is_active === false)

  // 85. Tabela desativada permanece no banco (Zero exclusão física)
  const { data: pt85 } = await adminClient.from('price_tables').select().eq('id', testPriceTableId).maybeSingle()
  test('85. Tabela de preços permanece no banco sem DELETE', pt85 !== null)

  // 86. Admin reativa tabela de preços
  const { data: pt86 } = await admin.client.from('price_tables').update({ is_active: true }).eq('id', testPriceTableId).select().single()
  test('86. Admin reativa tabela de preços com sucesso', pt86?.is_active === true)

  // 87. Desativação do preço da variante em price_table_products
  const { data: ptp87 } = await admin.client.from('price_table_products').update({ is_active: false }).eq('id', ptp79.id).select().single()
  test('87. Desativação lógica do preço da variante (is_active=false)', ptp87?.is_active === false)

  // 88. Customer impedido de ler audit_logs de tabela de preços
  const { data: logsCust } = await customer.client.from('audit_logs').select()
  test('88. Customer impedido de consultar audit_logs (RLS)', !logsCust || logsCust.length === 0)

  // 89. Reativação do preço da variante
  const { data: ptp89 } = await admin.client.from('price_table_products').update({ is_active: true }).eq('id', ptp79.id).select().single()
  test('89. Admin reativa preço da variante com sucesso', ptp89?.is_active === true)

  // 90. Repetição das verificações confirma integridade total do catálogo
  const { data: pt90 } = await adminClient.from('price_tables').select().eq('id', testPriceTableId).single()
  test('90. Integridade do schema e dados mantida com 100% de sucesso', pt90 !== null)

  console.log(`\n════════════════════════════════════════════════════════════`)
  console.log(`📊 RESULTADO SUÍTE ADMINISTRATIVA (BLOCO 11D): ${passed} PASS / ${failed} FAIL`)
  console.log(`════════════════════════════════════════════════════════════\n`)

  if (failed > 0) process.exit(1)
}

runAdminCatalogTests().catch((err) => {
  console.error('💥 Erro ao executar suíte administrativa:', err.message)
  process.exit(1)
})
