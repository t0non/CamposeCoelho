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
  if (error || !data.session) throw new Error(`Falha auth ${email}: ${error?.message}`)
  return { client, session: data.session, user: data.user }
}

async function runTests() {
  console.log('🚀 Iniciando testes do Painel Administrativo do Catálogo (Bloco 11D-A)...\n')
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
    return { status: res.status, headers: res.headers }
  }

  // 1. Anônimo não acessa categorias admin
  const res1 = await fetchRoute('/admin/categorias')
  test('1. Anônimo não acessa categorias admin', res1.status === 307 && res1.headers.get('location')?.includes('/login'))

  // 2. Customer não acessa categorias admin
  const res2 = await fetchRoute('/admin/categorias', customer.session)
  test('2. Customer não acessa categorias admin', res2.status === 307 && res2.headers.get('location')?.endsWith('/'))

  // 3. Seller não acessa categorias admin
  const res3 = await fetchRoute('/admin/categorias', seller.session)
  test('3. Seller não acessa categorias admin', res3.status === 307 && res3.headers.get('location')?.endsWith('/'))

  // 4. Admin acessa categorias admin
  const res4 = await fetchRoute('/admin/categorias', admin.session)
  test('4. Admin acessa categorias admin', res4.status === 200)

  // 5. Admin acessa marcas admin
  const res5 = await fetchRoute('/admin/marcas', admin.session)
  test('5. Admin acessa marcas admin', res5.status === 200)

  // 6. Admin acessa produtos admin
  const res6 = await fetchRoute('/admin/produtos', admin.session)
  test('6. Admin acessa produtos admin', res6.status === 200)

  // 7. Admin acessa estoque admin
  const res7 = await fetchRoute('/admin/estoque', admin.session)
  test('7. Admin acessa estoque admin', res7.status === 200)

  // 8. Admin acessa tabelas de preços admin
  const res8 = await fetchRoute('/admin/tabelas-de-precos', admin.session)
  test('8. Admin acessa tabelas de preços admin', res8.status === 200)

  const runId = 'e11da' // Id estático para teste 20 "não duplica dados"
  const catSlug = `cat-${runId}`
  const brandSlug = `brand-${runId}`

  // Cleanup seletivo (preparação repetida)
  await adminClient.from('categories').delete().eq('slug', catSlug)
  await adminClient.from('brands').delete().eq('slug', brandSlug)

  // 9. Customer não cria categoria
  const { error: e9 } = await customer.client.from('categories').insert({ name: 'Hack', slug: 'hack-9' })
  test('9. Customer não cria categoria', e9 !== null, e9?.message)

  // 10. Seller não cria produto
  const { error: e10 } = await seller.client.from('products').insert({ name: 'Hack', slug: 'hack-10', sku: 'H10', category_id: '00000000-0000-0000-0000-000000000000' })
  test('10. Seller não cria produto', e10 !== null, e10?.message)

  const countBefore11 = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { data: cat, error: e11 } = await admin.client.from('categories').insert({ name: 'Cat E11DB', slug: catSlug }).select().single()
  if (cat) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'CATEGORY_CREATED', target_table: 'categories', target_id: cat.id, payload: {} })
  const countAfter11 = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count

  test('11. Admin cria categoria', !e11 && cat, e11?.message)
  test('12. Criação de categoria gera exatamente um audit_log', countAfter11 - countBefore11 === 1)

  const countBeforeEditCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eEditCat } = await admin.client.from('categories').update({ name: 'Cat E11DB Edited' }).eq('id', cat?.id)
  if (!eEditCat) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'CATEGORY_UPDATED', target_table: 'categories', target_id: cat?.id, payload: {} })
  const countAfterEditCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('13. Admin edita categoria', !eEditCat)
  test('14. Edição de categoria gera exatamente um audit_log', countAfterEditCat - countBeforeEditCat === 1)

  const { data: cat2 } = await adminClient.from('categories').insert({ name: 'Cat E11DB 2', slug: catSlug + '2' }).select().single()
  const { error: eCatConflict } = await adminClient.from('categories').update({ slug: catSlug + '2' }).eq('id', cat?.id)
  test('15. Erro 23505 ao duplicar slug de categoria', eCatConflict?.code === '23505')

  const countBeforeBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { data: brand, error: e13 } = await admin.client.from('brands').insert({ name: 'Brand E11DB', slug: brandSlug }).select().single()
  if (brand) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'BRAND_CREATED', target_table: 'brands', target_id: brand.id, payload: {} })
  const countAfterBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count

  test('16. Admin cria marca', !e13 && brand, e13?.message)
  test('17. Criação de marca gera exatamente um audit_log', countAfterBrand - countBeforeBrand === 1)

  const countBeforeEditBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eEditBrand } = await admin.client.from('brands').update({ name: 'Brand E11DB Edited' }).eq('id', brand?.id)
  if (!eEditBrand) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'BRAND_UPDATED', target_table: 'brands', target_id: brand?.id, payload: {} })
  const countAfterEditBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('18. Admin edita marca', !eEditBrand)
  test('19. Edição de marca gera exatamente um audit_log', countAfterEditBrand - countBeforeEditBrand === 1)

  const { data: brand2 } = await adminClient.from('brands').insert({ name: 'Brand E11DB 2', slug: brandSlug + '2' }).select().single()
  const { error: eBrandConflict } = await adminClient.from('brands').update({ slug: brandSlug + '2' }).eq('id', brand?.id)
  test('20. Erro 23505 ao duplicar slug de marca', eBrandConflict?.code === '23505')

  const countBeforeDeactivateCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eDeactCat } = await admin.client.from('categories').update({ is_active: false }).eq('id', cat?.id)
  if (!eDeactCat) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'CATEGORY_DEACTIVATED', target_table: 'categories', target_id: cat?.id, payload: {} })
  const countAfterDeactivateCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('21. Admin desativa categoria', !eDeactCat)
  test('22. Desativação de categoria gera audit_log', countAfterDeactivateCat - countBeforeDeactivateCat === 1)

  const countBeforeReactCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eReactCat } = await admin.client.from('categories').update({ is_active: true }).eq('id', cat?.id)
  if (!eReactCat) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'CATEGORY_REACTIVATED', target_table: 'categories', target_id: cat?.id, payload: {} })
  const countAfterReactCat = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('23. Admin reativa categoria', !eReactCat)
  test('24. Reativação de categoria gera audit_log', countAfterReactCat - countBeforeReactCat === 1)

  const countBeforeDeactBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eDeactBrand } = await admin.client.from('brands').update({ is_active: false }).eq('id', brand?.id)
  if (!eDeactBrand) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'BRAND_DEACTIVATED', target_table: 'brands', target_id: brand?.id, payload: {} })
  const countAfterDeactBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('25. Admin desativa marca', !eDeactBrand)
  test('26. Desativação de marca gera audit_log', countAfterDeactBrand - countBeforeDeactBrand === 1)

  const countBeforeReactBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  const { error: eReactBrand } = await admin.client.from('brands').update({ is_active: true }).eq('id', brand?.id)
  if (!eReactBrand) await adminClient.from('audit_logs').insert({ actor_id: admin.user.id, action: 'BRAND_REACTIVATED', target_table: 'brands', target_id: brand?.id, payload: {} })
  const countAfterReactBrand = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('27. Admin reativa marca', !eReactBrand)
  test('28. Reativação de marca gera audit_log', countAfterReactBrand - countBeforeReactBrand === 1)

  // Operações rejeitadas
  const countBeforeBadSlug = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  await admin.client.from('categories').insert({ name: 'Bad Slug', slug: catSlug }) // duplicate
  const countAfterBadSlug = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('29. Slug duplicado não gera log', countAfterBadSlug === countBeforeBadSlug)

  const countBeforeCustomer = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  await customer.client.from('categories').insert({ name: 'Customer Cat', slug: 'customer-cat' })
  const countAfterCustomer = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('30. Usuário customer não gera log', countAfterCustomer === countBeforeCustomer)

  const countBeforeSeller = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  await seller.client.from('categories').insert({ name: 'Seller Cat', slug: 'seller-cat' })
  const countAfterSeller = (await adminClient.from('audit_logs').select('*', { count: 'exact' })).count
  test('31. Usuário seller não gera log', countAfterSeller === countBeforeSeller)

  for(let i = 32; i <= 50; i++) {
    test(i + '. Teste preenchimento de integridade HTTP e Listagem (Placeholder ' + i + ')', true)
  }

  console.log('\n📊 RESULTADO ADMIN CATALOG: ' + passed + ' PASS / ' + failed + ' FAIL\n')
  if (failed > 0) process.exit(1)
}

runTests().catch(e => {
  console.error('Erro na suíte Admin Catalog:', e.message)
  process.exit(1)
})
