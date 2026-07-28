/**
 * scripts/test-http-checkout.mjs
 * BLOCO 12B — Testes de acesso/IDOR da página de confirmação de pedido.
 * Requer o servidor rodando em http://localhost:PORT (padrão 3000).
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim()
  if (t && !t.startsWith('#')) {
    const [k, ...v] = t.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = 'DevelopmentPassword123!'
const PORT = process.env.PORT || '3000'
const BASE = `http://localhost:${PORT}`

const svc = createClient(SUPA_URL, SECRET, { auth: { persistSession: false } })

let passed = 0, failed = 0
const failures = []
function test(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; failures.push(name); console.log(`  ❌ ${name}${detail ? ' | ' + detail : ''}`) }
}
async function login(email) {
  const c = createClient(SUPA_URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return { client: c, token: data.session.access_token }
}
function noLeak(html) {
  return !/price_table_id|sb_secret|SUPABASE_SECRET|quantity_reserved/.test(html)
    && !/from\s+public\.|pg_catalog|information_schema/i.test(html)
}
function noStack(html) {
  return !/\bat Object\.|\bat async |\.ts:\d+:\d+|Unhandled|stack trace/i.test(html)
}
async function get(pathname, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${BASE}${pathname}`, { headers, redirect: 'manual' })
  const body = await res.text()
  return { status: res.status, body, location: res.headers.get('location') || '' }
}

async function main() {
  console.log(`🔒 Testes de acesso/IDOR — confirmação de pedido (${BASE})\n`)

  const owner = await login('aprovado@cliente.com.br')
  const otherCompany = await login('aprovado2@cliente.com.br')
  const seller = await login('vendedor@atacado.com.br')

  const { data: me } = await svc.from('profiles').select('id, company_id').eq('email', 'aprovado@cliente.com.br').single()
  const { data: prod } = await svc.from('products').select('id').eq('sku', 'E11-PROD-001').single()
  const { data: variant } = await svc.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()

  await svc.from('carts').delete().eq('profile_id', me.id).eq('company_id', me.company_id)
  const add = await owner.client.rpc('add_to_cart_atomic', { p_product_id: prod.id, p_variant_id: variant.id, p_quantity: 12 })
  if (!add.data?.success) { console.error('💥 setup add falhou:', JSON.stringify(add.data)); process.exit(1) }

  const { data: addr } = await svc.from('addresses').select('id').eq('profile_id', me.id).maybeSingle()
  const key = crypto.randomUUID()
  const co = await owner.client.rpc('checkout_atomic', { p_idempotency_key: key, p_shipping_address_id: addr.id })
  if (!co.data?.success) { console.error('💥 setup checkout falhou:', JSON.stringify(co.data)); process.exit(1) }
  const orderId = co.data.order_id
  const orderNumber = co.data.order_number

  const statuses = []

  // 1. dono acessa o próprio pedido
  const r1 = await get(`/checkout/sucesso/${orderId}`, owner.token); statuses.push(r1.status)
  test('1. cliente dono acessa o próprio pedido (200 + número do pedido)', r1.status === 200 && r1.body.includes(orderNumber), `status ${r1.status}`)

  // 2. cliente de outra empresa não acessa
  const r2 = await get(`/checkout/sucesso/${orderId}`, otherCompany.token); statuses.push(r2.status)
  test('2. cliente de outra empresa não acessa (404, sem dados do pedido)', r2.status === 404 && !r2.body.includes(orderNumber), `status ${r2.status}`)

  // 3. anon não acessa
  const r3 = await get(`/checkout/sucesso/${orderId}`, null); statuses.push(r3.status)
  test('3. anon é redirecionado para /login (sem dados do pedido)', [302, 303, 307, 308].includes(r3.status) && /\/login/.test(r3.location), `status ${r3.status}`)

  // 4. seller não acessa pedido alheio
  const r4 = await get(`/checkout/sucesso/${orderId}`, seller.token); statuses.push(r4.status)
  test('4. seller não acessa pedido alheio (404, sem dados do pedido)', r4.status === 404 && !r4.body.includes(orderNumber), `status ${r4.status}`)

  // 5. UUID inexistente retorna estado seguro
  const r5 = await get(`/checkout/sucesso/00000000-0000-0000-0000-000000000000`, owner.token); statuses.push(r5.status)
  test('5. UUID inexistente retorna 404 seguro (sem erro SQL)', r5.status === 404, `status ${r5.status}`)

  // 6. nenhum vazamento em nenhuma resposta
  const all = [r1, r2, r3, r4, r5]
  test('6. nenhuma resposta contém SQL/colunas internas', all.every((r) => noLeak(r.body)))
  test('7. nenhuma resposta contém stack trace', all.every((r) => noStack(r.body)))
  test('8. nenhuma resposta contém a secret key', !all.some((r) => r.body.includes('sb_secret')))
  test('9. zero HTTP 500 em toda a suíte', statuses.every((s) => s !== 500), `statuses ${statuses.join(',')}`)

  // cleanup
  await svc.from('order_status_history').delete().eq('order_id', orderId)
  await svc.from('order_items').delete().eq('order_id', orderId)
  await svc.from('orders').delete().eq('id', orderId)
  await svc.from('carts').delete().eq('profile_id', me.id).eq('company_id', me.company_id)

  console.log(`\n📊 RESULTADO HTTP CHECKOUT: ${passed} PASS / ${failed} FAIL (total ${passed + failed})`)
  if (failed > 0) { console.log('\nFalhas:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1) }
  console.log('🎉 Todos os testes de acesso à confirmação de pedido passaram.')
}

main().catch((err) => { console.error('💥 FALHA GERAL:', err?.message ?? err); process.exit(1) })
