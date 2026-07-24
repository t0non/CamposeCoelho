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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('💥 Variáveis de ambiente ausentes.')
  process.exit(1)
}

async function loginAs(email, password = 'DevelopmentPassword123!') {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Falha auth ${email}`)
  return data.session
}

async function fetchRoute(path, session = null) {
  const headers = {}
  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`http://localhost:3000${path}`, { headers, redirect: 'manual' })
  return { status: res.status, headers: res.headers }
}

async function runTests() {
  console.log('🚀 Iniciando testes HTTP Administrativos (Fundação 11D-A)...\n')
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

  const adminSession = await loginAs('admin@atacado.com.br')
  const customerSession = await loginAs('aprovado@cliente.com.br')
  const sellerSession = await loginAs('vendedor@atacado.com.br')

  // 1. Anônimo não acessa categorias admin
  const res1 = await fetchRoute('/admin/categorias')
  test('1. Anônimo não acessa categorias admin', res1.status === 307 && res1.headers.get('location')?.includes('/login'))

  // 2. Customer não acessa categorias admin
  const res2 = await fetchRoute('/admin/categorias', customerSession)
  test('2. Customer não acessa categorias admin', res2.status === 307 && res2.headers.get('location')?.endsWith('/'), `Status: ${res2.status}, Location: ${res2.headers.get('location')}`)

  // 3. Seller não acessa categorias admin
  const res3 = await fetchRoute('/admin/categorias', sellerSession)
  test('3. Seller não acessa categorias admin', res3.status === 307 && res3.headers.get('location')?.endsWith('/'), `Status: ${res3.status}, Location: ${res3.headers.get('location')}`)

  // 4. Admin acessa categorias admin
  const res4 = await fetchRoute('/admin/categorias', adminSession)
  test('4. Admin acessa categorias admin', res4.status === 200, `Status: ${res4.status}, Location: ${res4.headers.get('location')}`)

  // 5. Admin acessa marcas admin
  const res5 = await fetchRoute('/admin/marcas', adminSession)
  test('5. Admin acessa marcas admin', res5.status === 200, `Status: ${res5.status}, Location: ${res5.headers.get('location')}`)

  // 6. Admin acessa produtos admin
  const res6 = await fetchRoute('/admin/produtos', adminSession)
  test('6. Admin acessa produtos admin', res6.status === 200, `Status: ${res6.status}, Location: ${res6.headers.get('location')}`)

  // 7. Admin acessa estoque admin
  const res7 = await fetchRoute('/admin/estoque', adminSession)
  test('7. Admin acessa estoque admin', res7.status === 200, `Status: ${res7.status}, Location: ${res7.headers.get('location')}`)

  // 8. Admin acessa tabelas de preços admin
  const res8 = await fetchRoute('/admin/tabelas-de-precos', adminSession)
  test('8. Admin acessa tabelas de preços admin', res8.status === 200, `Status: ${res8.status}, Location: ${res8.headers.get('location')}`)

  console.log(`\n📊 RESULTADO HTTP ADMIN: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runTests().catch(e => {
  console.error('Erro na suíte HTTP Admin:', e.message)
  process.exit(1)
})
