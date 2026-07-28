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
  console.log('🚀 Iniciando testes HTTP do Painel Administrativo (Bloco 11D-B)...\n')
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

  const routes = [
    '/admin/categorias',
    '/admin/categorias/nova',
    '/admin/marcas',
    '/admin/marcas/nova'
  ]

  // Pegar ids válidos para categorias e marcas
  const { data: cat } = await adminClient.from('categories').select('id').limit(1).single()
  const { data: brand } = await adminClient.from('brands').select('id').limit(1).single()

  if (cat) routes.push(`/admin/categorias/${cat.id}`)
  if (brand) routes.push(`/admin/marcas/${brand.id}`)

  // Testes ANON
  for (const route of routes) {
    const res = await fetchRoute(route)
    test(`ANON: ${route} redireciona p/ login`, res.status === 307 && res.headers.get('location').includes('/login'))
  }

  // Testes CUSTOMER
  for (const route of routes) {
    const res = await fetchRoute(route, customer.session)
    test(`CUSTOMER: ${route} redireciona`, res.status === 307 && res.headers.get('location').endsWith('/'))
  }

  // Testes SELLER
  for (const route of routes) {
    const res = await fetchRoute(route, seller.session)
    test(`SELLER: ${route} redireciona`, res.status === 307 && res.headers.get('location').endsWith('/'))
  }

  // Testes ADMIN - Validos
  for (const route of routes) {
    const res = await fetchRoute(route, admin.session)
    const noSecrets = !res.text.includes(SERVICE_KEY)
    const noStackTrace = !res.text.includes('node_modules') && !res.text.includes('Error:')
    test(`ADMIN: ${route} retorna 200 sem secrets/stacktrace`, res.status === 200 && noSecrets && noStackTrace)
  }

  // Testes de 404 e 500
  const invalidUuidRes = await fetchRoute('/admin/categorias/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de categoria inexistente retorna 404', invalidUuidRes.status === 404)

  const malformedUuidRes = await fetchRoute('/admin/categorias/invalid-id-xyz', admin.session)
  test('ADMIN: ID de categoria malformado retorna 404 (não 500)', malformedUuidRes.status === 404)

  const invalidBrandRes = await fetchRoute('/admin/marcas/99999999-9999-9999-9999-999999999999', admin.session)
  test('ADMIN: ID de marca inexistente retorna 404', invalidBrandRes.status === 404)

  const malformedBrandRes = await fetchRoute('/admin/marcas/invalid-id-xyz', admin.session)
  test('ADMIN: ID de marca malformado retorna 404 (não 500)', malformedBrandRes.status === 404)

  // Paginação e filtros normalizados
  const pagRes = await fetchRoute('/admin/categorias?page=invalid&search=teste', admin.session)
  test('ADMIN: Listagem com query inválida é normalizada para 200', pagRes.status === 200)

  console.log(`\n📊 RESULTADO HTTP ADMIN CATALOG: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runTests().catch(e => {
  console.error('Erro:', e)
  process.exit(1)
})
