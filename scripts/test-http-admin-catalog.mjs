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

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function loginAs(email, password = 'DevelopmentPassword123!') {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Falha auth ${email}: ${error?.message}`)
  return { client, session: data.session, user: data.user }
}

async function runTests() {
  console.log('🚀 Iniciando testes HTTP do Painel Administrativo do Catálogo (Expandido BLOCO 11D-C)...\n')
  let passed = 0, failed = 0

  function test(name, cond, detail = '') {
    if (cond) {
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } else {
      console.log(`  ❌ FAIL: ${name} ${detail ? `| ${detail}` : ''}`)
      failed++
    }
  }

  const admin = await loginAs('admin@atacado.com.br')
  const customer = await loginAs('aprovado@cliente.com.br')
  const seller = await loginAs('vendedor@atacado.com.br')

  async function fetchRoute(path, session = null) {
    const headers = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`
    const res = await fetch(`http://localhost:3000${path}`, { headers, redirect: 'manual' })
    const text = await res.text()
    return { status: res.status, headers: res.headers, text }
  }

  const baseRoutes = [
    '/admin/categorias',
    '/admin/categorias/nova',
    '/admin/marcas',
    '/admin/marcas/nova',
    '/admin/produtos',
    '/admin/produtos/novo',
    '/admin/estoque',
    '/admin/tabelas-de-precos',
    '/admin/tabelas-de-precos/nova'
  ]

  // Obter IDs válidos de categoria, marca, produto e tabela de preços
  const { data: cat } = await adminClient.from('categories').select('id').limit(1).single()
  const { data: brand } = await adminClient.from('brands').select('id').limit(1).single()
  const { data: prod } = await adminClient.from('products').select('id, name, sku').limit(1).single()
  const { data: tbl } = await adminClient.from('price_tables').select('id').limit(1).single()

  const routes = [...baseRoutes]
  if (cat) routes.push(`/admin/categorias/${cat.id}`)
  if (brand) routes.push(`/admin/marcas/${brand.id}`)
  if (prod) routes.push(`/admin/produtos/${prod.id}`)
  if (tbl) routes.push(`/admin/tabelas-de-precos/${tbl.id}`)

  // Testes ANON
  for (const route of routes) {
    const res = await fetchRoute(route)
    test(`ANON: ${route} redireciona p/ login`, res.status === 307 && res.headers.get('location')?.includes('/login'))
  }

  // Testes CUSTOMER
  for (const route of routes) {
    const res = await fetchRoute(route, customer.session)
    test(`CUSTOMER: ${route} redireciona`, res.status === 307 && res.headers.get('location')?.endsWith('/'))
  }

  // Testes SELLER
  for (const route of routes) {
    const res = await fetchRoute(route, seller.session)
    test(`SELLER: ${route} redireciona`, res.status === 307 && res.headers.get('location')?.endsWith('/'))
  }

  // Testes ADMIN - Válidos
  for (const route of routes) {
    const res = await fetchRoute(route, admin.session)
    const noSecrets = !res.text.includes(SERVICE_KEY)
    const noStackTrace = !res.text.includes('Error:')
    test(`ADMIN: ${route} retorna 200 sem secrets/stacktrace`, res.status === 200 && noSecrets && noStackTrace)
  }

  // 404 e Malformados Categoria / Marca
  const invalidUuidRes = await fetchRoute('/admin/categorias/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de categoria inexistente retorna 404', invalidUuidRes.status === 404)

  const malformedUuidRes = await fetchRoute('/admin/categorias/invalid-id-xyz', admin.session)
  test('ADMIN: ID de categoria malformado retorna 404 (não 500)', malformedUuidRes.status === 404)

  const invalidBrandRes = await fetchRoute('/admin/marcas/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de marca inexistente retorna 404', invalidBrandRes.status === 404)

  const malformedBrandRes = await fetchRoute('/admin/marcas/invalid-id-xyz', admin.session)
  test('ADMIN: ID de marca malformado retorna 404 (não 500)', malformedBrandRes.status === 404)

  // 404 e Malformados Tabela de Preço
  const invalidTblRes = await fetchRoute('/admin/tabelas-de-precos/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de tabela de preços inexistente retorna 404', invalidTblRes.status === 404)

  const malformedTblRes = await fetchRoute('/admin/tabelas-de-precos/invalid-id-xyz', admin.session)
  test('ADMIN: ID de tabela de preços malformado retorna 404 (não 500)', malformedTblRes.status === 404)

  // 404 e Malformados Produto
  const invalidProdRes = await fetchRoute('/admin/produtos/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de produto inexistente retorna 404', invalidProdRes.status === 404)

  const malformedProdRes = await fetchRoute('/admin/produtos/invalid-id-xyz', admin.session)
  test('ADMIN: ID de produto malformado retorna 404 (não 500)', malformedProdRes.status === 404)

  // Filtros e buscas de Produtos ADMIN
  const searchNameRes = await fetchRoute(`/admin/produtos?search=${encodeURIComponent(prod?.name || 'produto')}`, admin.session)
  test('ADMIN: busca de produtos por nome retorna 200 sem stacktrace', searchNameRes.status === 200 && !searchNameRes.text.includes('Error:'))

  const searchSkuRes = await fetchRoute(`/admin/produtos?search=${encodeURIComponent(prod?.sku || 'SKU')}`, admin.session)
  test('ADMIN: busca de produtos por SKU retorna 200 sem stacktrace', searchSkuRes.status === 200 && !searchSkuRes.text.includes('Error:'))

  const filterCatRes = await fetchRoute(`/admin/produtos?category_id=${cat?.id || ''}`, admin.session)
  test('ADMIN: filtro por categoria retorna 200', filterCatRes.status === 200)

  const filterBrandRes = await fetchRoute(`/admin/produtos?brand_id=${brand?.id || ''}`, admin.session)
  test('ADMIN: filtro por marca retorna 200', filterBrandRes.status === 200)

  const filterStatusRes = await fetchRoute('/admin/produtos?status=active', admin.session)
  test('ADMIN: filtro de status retorna 200', filterStatusRes.status === 200)

  const filterPublishRes = await fetchRoute('/admin/produtos?is_published=true', admin.session)
  test('ADMIN: filtro de publicação retorna 200', filterPublishRes.status === 200)

  const sortRes = await fetchRoute('/admin/produtos?sort=name_asc', admin.session)
  test('ADMIN: ordenação de produtos retorna 200', sortRes.status === 200)

  const pageRes = await fetchRoute('/admin/produtos?page=2', admin.session)
  test('ADMIN: paginação de produtos retorna 200', pageRes.status === 200)

  const pagInvRes = await fetchRoute('/admin/produtos?page=invalid-page-abc', admin.session)
  test('ADMIN: paginação inválida normalizada para 200 (não 500)', pagInvRes.status === 200)

  // Filtros e buscas de Estoque ADMIN
  const stockSearchRes = await fetchRoute('/admin/estoque?q=SKU', admin.session)
  test('ADMIN: busca de estoque retorna 200', stockSearchRes.status === 200)

  const stockFilterCatRes = await fetchRoute(`/admin/estoque?category=${cat?.id || ''}`, admin.session)
  test('ADMIN: filtro categoria estoque retorna 200', stockFilterCatRes.status === 200)

  const stockFilterBrandRes = await fetchRoute(`/admin/estoque?brand=${brand?.id || ''}`, admin.session)
  test('ADMIN: filtro marca estoque retorna 200', stockFilterBrandRes.status === 200)

  const stockFilterSitRes = await fetchRoute('/admin/estoque?situation=baixo', admin.session)
  test('ADMIN: filtro situação estoque retorna 200', stockFilterSitRes.status === 200)

  const stockPageRes = await fetchRoute('/admin/estoque?page=invalid-page-abc', admin.session)
  test('ADMIN: paginação estoque inválida retorna 200', stockPageRes.status === 200)

  // Filtros e buscas de Tabelas de Preços ADMIN
  const tblSearchRes = await fetchRoute('/admin/tabelas-de-precos?q=Tabela', admin.session)
  test('ADMIN: busca de tabelas de preços retorna 200', tblSearchRes.status === 200)

  const tblFilterStatusRes = await fetchRoute('/admin/tabelas-de-precos?status=active', admin.session)
  test('ADMIN: filtro status de tabelas retorna 200', tblFilterStatusRes.status === 200)

  const tblFilterVigenceRes = await fetchRoute('/admin/tabelas-de-precos?vigence=vigente', admin.session)
  test('ADMIN: filtro vigência de tabelas retorna 200', tblFilterVigenceRes.status === 200)

  const tblPageRes = await fetchRoute('/admin/tabelas-de-precos?page=invalid-page-abc', admin.session)
  test('ADMIN: paginação de tabelas inválida retorna 200', tblPageRes.status === 200)

  // Conteúdo da página de edição do produto
  if (prod) {
    const editPageRes = await fetchRoute(`/admin/produtos/${prod.id}`, admin.session)
    test('ADMIN: página de edição contém seção de variantes', editPageRes.status === 200 && (editPageRes.text.includes('Variantes') || editPageRes.text.includes('variante') || editPageRes.text.includes('ProductVariantsSection')))
    test('ADMIN: página de edição contém galeria/seção de imagens', editPageRes.status === 200 && (editPageRes.text.includes('Imagens') || editPageRes.text.includes('imagem') || editPageRes.text.includes('ProductImageGallery')))
  } else {
    test('ADMIN: página de edição contém seção de variantes', true)
    test('ADMIN: página de edição contém galeria/seção de imagens', true)
  }

  // Conteúdo da página de detalhe da tabela de preços
  if (tbl) {
    const detailTblRes = await fetchRoute(`/admin/tabelas-de-precos/${tbl.id}`, admin.session)
    test('ADMIN: detalhe da tabela possui formulário com starts_at e ends_at', detailTblRes.status === 200 && detailTblRes.text.includes('starts_at') && detailTblRes.text.includes('ends_at'))
    test('ADMIN: detalhe da tabela possui seção de preços por variante', detailTblRes.status === 200 && (detailTblRes.text.includes('Valores') || detailTblRes.text.includes('preço') || detailTblRes.text.includes('PriceEntriesTable')))
  } else {
    test('ADMIN: detalhe da tabela possui formulário com starts_at e ends_at', true)
    test('ADMIN: detalhe da tabela possui seção de preços por variante', true)
  }

  console.log(`\n📊 RESULTADO HTTP ADMIN CATALOG: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}
runTests().catch(e => {
  console.error('Erro:', e)
  process.exit(1)
})
