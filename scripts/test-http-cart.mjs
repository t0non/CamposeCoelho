/**
 * scripts/test-http-cart.mjs
 * BLOCO 12A — Testes HTTP da página /carrinho contra o servidor Next real.
 *
 * Requer o servidor rodando em http://localhost:PORT (padrão 3000).
 * Autenticação SSR via header Authorization: Bearer <access_token> (o server
 * client injeta o cookie sintético — ver lib/supabase/server.ts).
 *
 * service_role: apenas setup/cleanup do carrinho de teste e do estoque.
 * Nenhuma asserção representa usuário comercial via service_role.
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#')) {
      const [k, ...v] = t.split('=')
      if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = 'DevelopmentPassword123!'
const PORT = process.env.PORT || '3000'
const BASE = `http://localhost:${PORT}`

if (!SUPA_URL || !ANON || !SECRET) {
  console.error('💥 Variáveis de ambiente ausentes.')
  process.exit(1)
}

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
  // Indicadores reais de vazamento: segredos, colunas internas de negócio e
  // fragmentos de SQL qualificado. Evita termos genéricos ("select") que
  // aparecem legitimamente no bundle JS de qualquer página.
  return !/price_table_id|sb_secret|SUPABASE_SECRET|SUPABASE_SERVICE|quantity_reserved/.test(html)
     && !/from\s+public\.|pg_catalog|information_schema|SELECT\s+\w+\s+FROM\s+public/i.test(html)
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
  console.log(`🔒 Testes HTTP do carrinho contra ${BASE}\n`)

  // Confirmar servidor no ar
  try {
    const ping = await fetch(`${BASE}/carrinho`, { redirect: 'manual' })
    if (!ping) throw new Error('sem resposta')
  } catch (err) {
    console.error(`💥 Servidor não respondeu em ${BASE}. Suba o dev server antes.`)
    process.exit(1)
  }

  const approved = await login('aprovado@cliente.com.br')
  const pending = await login('pendente@cliente.com.br')
  const rejected = await login('recusado@cliente.com.br')
  const seller = await login('vendedor@atacado.com.br')
  const admin = await login('admin@atacado.com.br')

  // Setup: popular carrinho do aprovado com E11-VAR-001A (tabela default)
  const { data: me } = await svc.from('profiles').select('id, company_id').eq('email', 'aprovado@cliente.com.br').single()
  const { data: comp } = await svc.from('companies').select('id').eq('id', me.company_id).single()
  const { data: prod } = await svc.from('products').select('id').eq('sku', 'E11-PROD-001').single()
  const { data: variant } = await svc.from('product_variants').select('id').eq('sku', 'E11-VAR-001A').single()
  const { data: prod2 } = await svc.from('products').select('id, slug').eq('sku', 'E11-PROD-002').single()
  const { data: variant2A } = await svc.from('product_variants').select('id, sku').eq('sku', 'E11-VAR-002A').single()
  const { data: variant2B } = await svc.from('product_variants').select('id, sku').eq('sku', 'E11-VAR-002B').single()
  await svc.from('carts').delete().eq('profile_id', me.id).eq('company_id', comp.id)
  const addRes = await approved.client.rpc('add_to_cart_atomic', { p_product_id: prod.id, p_variant_id: variant.id, p_quantity: 12 })
  if (!addRes.data?.success) { console.error('💥 setup add falhou:', JSON.stringify(addRes.data), addRes.error?.message); process.exit(1) }
  // E11-VAR-002B é semeada com estoque 0 (cenário "sem estoque" usado por outras suítes).
  // Para o setup deste teste, elevamos temporariamente e restauramos ao final.
  await svc.from('inventories').update({ quantity_available: 20 }).eq('product_id', prod2.id).eq('variant_id', variant2B.id)
  // Adiciona a variante B de outro produto para comprovar renderização correta multi-variante em /carrinho
  const addRes2 = await approved.client.rpc('add_to_cart_atomic', { p_product_id: prod2.id, p_variant_id: variant2B.id, p_quantity: 6 })
  if (!addRes2.data?.success) { console.error('💥 setup add2 falhou:', JSON.stringify(addRes2.data), addRes2.error?.message); process.exit(1) }

  const statuses = []

  // 1. anon → redirect para login
  const r1 = await get('/carrinho', null); statuses.push(r1.status)
  test('1. anon é redirecionado para /login', [302, 303, 307, 308].includes(r1.status), `status ${r1.status}`)
  // 2. destino do redirect é /login
  test('2. redirect do anon aponta para /login', /\/login/.test(r1.location), r1.location)

  // 3. approved com itens → 200
  const r3 = await get('/carrinho', approved.token); statuses.push(r3.status)
  test('3. approved com itens retorna 200', r3.status === 200, `status ${r3.status}`)
  // 4. mostra nome do produto
  test('4. carrinho exibe o produto adicionado', /Pote Hermético/i.test(r3.body))
  // 4b. carrinho exibe o SKU correto da variante B adicionada (não confunde com A)
  test('4b. carrinho exibe o SKU correto da variante B', r3.body.includes(variant2B.sku) && !r3.body.includes(variant2A.sku))
  // 5. aviso obrigatório de confirmação
  test('5. exibe aviso de confirmação no checkout', /Valores e disponibilidade serão confirmados/i.test(r3.body))
  // 6. subtotal estimado
  test('6. exibe Subtotal Estimado', /Subtotal Estimado/i.test(r3.body))
  // 7. contador/unidades
  test('7. exibe contagem de itens/unidades', /\b12\b/.test(r3.body) && /(item|itens)/i.test(r3.body))
  // 8. preço formatado R$
  test('8. exibe preço estimado em R$', /R\$\s?\d/.test(r3.body))
  // 9. checkout desabilitado (12B), sem pedido falso
  test('9. finalização indica indisponível (checkout 12B)', /finaliza[çc][ãa]o do pedido|checkout|em breve/i.test(r3.body))
  // 10. sem vazamento SQL/segredos
  test('10. HTML do approved sem SQL/segredos', noLeak(r3.body))
  // 11. sem stack trace
  test('11. HTML do approved sem stack trace', noStack(r3.body))

  // 12. pending → redirecionado para /conta-pendente (proxy protege o carrinho)
  const r12 = await get('/carrinho', pending.token); statuses.push(r12.status)
  test('12. pending é redirecionado para /conta-pendente', [302, 303, 307, 308].includes(r12.status) && /\/conta-pendente/.test(r12.location), `status ${r12.status} loc ${r12.location}`)
  // 13. rejected → redirecionado para /conta-recusada
  const r13 = await get('/carrinho', rejected.token); statuses.push(r13.status)
  test('13. rejected é redirecionado para /conta-recusada', [302, 303, 307, 308].includes(r13.status) && /\/conta-recusada/.test(r13.location), `status ${r13.status} loc ${r13.location}`)

  // 14. seller → 200 com aviso de contexto de empresa
  const r14 = await get('/carrinho', seller.token); statuses.push(r14.status)
  test('14. seller retorna 200 com aviso de contexto de empresa', r14.status === 200 && /Contexto de empresa/i.test(r14.body), `status ${r14.status}`)
  // 15. seller não vaza empresa alheia
  test('15. seller sem vazamento de dados sensíveis', noLeak(r14.body) && noStack(r14.body))

  // 16. admin → 200 sem itens comerciais e sem vazamento
  const r16 = await get('/carrinho', admin.token); statuses.push(r16.status)
  test('16. admin retorna 200 fora do fluxo comercial', r16.status === 200 && noLeak(r16.body) && noStack(r16.body), `status ${r16.status}`)

  // 17. item indisponível é sinalizado quando estoque cai
  await svc.from('inventories').update({ quantity_available: 5, quantity_reserved: 0 }).eq('product_id', prod.id).eq('variant_id', variant.id)
  const r17 = await get('/carrinho', approved.token); statuses.push(r17.status)
  await svc.from('inventories').update({ quantity_available: 100, quantity_reserved: 0 }).eq('product_id', prod.id).eq('variant_id', variant.id)
  test('17. item indisponível é sinalizado (aviso seguro, sem 500)', r17.status === 200 && /indispon[íi]|Estoque insuficiente/i.test(r17.body))

  // 18. ID/rota malformada não gera 500
  const r18 = await get('/carrinho/%2e%2e/%2e%2e', approved.token); statuses.push(r18.status)
  test('18. rota malformada não gera HTTP 500', r18.status !== 500, `status ${r18.status}`)
  // 19. query param inesperado não gera 500
  const r19 = await get('/carrinho?qty=abc&item=%00', approved.token); statuses.push(r19.status)
  test('19. query param inválido não gera HTTP 500', r19.status === 200, `status ${r19.status}`)

  // 20. estado vazio após limpar
  await approved.client.rpc('clear_cart_atomic', { p_target_company_id: null })
  const r20 = await get('/carrinho', approved.token); statuses.push(r20.status)
  test('20. carrinho vazio exibe estado vazio', r20.status === 200 && /carrinho está vazio/i.test(r20.body), `status ${r20.status}`)

  // ── Seleção de variante na página de produto (BLOCO 12A — correção) ──
  const rProd = await get(`/produto/${prod2.slug}`, approved.token); statuses.push(rProd.status)
  test('25. produto com múltiplas variantes possui seletor (role=radio)', rProd.status === 200 && /role="radio"/.test(rProd.body), `status ${rProd.status}`)
  test('26. produto com múltiplas variantes exibe as duas opções', rProd.body.includes(variant2A.sku) && rProd.body.includes(variant2B.sku))
  test('27. botão não permite adicionar antes da seleção (placeholder de seleção)', /Selecione uma opção/i.test(rProd.body))
  test('28. nenhuma variante aparece marcada como selecionada sem escolha explícita', !/aria-checked="true"/.test(rProd.body))
  test('29. HTML da página de produto sem SQL/segredos', noLeak(rProd.body))
  test('30. HTML da página de produto sem stack trace', noStack(rProd.body))

  // Seleção explícita via ?variant= (equivalente ao clique real no seletor)
  const rProdSelA = await get(`/produto/${prod2.slug}?variant=${variant2A.id}`, approved.token); statuses.push(rProdSelA.status)
  test('31. após seleção explícita da variante A, ela aparece marcada', rProdSelA.status === 200 && /aria-checked="true"/.test(rProdSelA.body))
  test('32. após seleção, placeholder de seleção some e preço aparece', !/Selecione uma opção acima/i.test(rProdSelA.body) && /R\$\s?\d/.test(rProdSelA.body))
  test('33. após seleção, botão Adicionar ao Pedido fica disponível', /Adicionar ao Pedido/i.test(rProdSelA.body))

  const rProdSelB = await get(`/produto/${prod2.slug}?variant=${variant2B.id}`, approved.token); statuses.push(rProdSelB.status)
  test('34. selecionar a variante B reflete o SKU de B (não o de A)', rProdSelB.body.includes(variant2B.sku))

  // 35. variant_id de outro produto na URL não é aceito como seleção válida (cai no estado "não selecionado")
  const rProdBadVar = await get(`/produto/${prod2.slug}?variant=${variant.id}`, approved.token); statuses.push(rProdBadVar.status)
  test('35. variant_id de outro produto na URL não conta como seleção válida', rProdBadVar.status === 200 && /Selecione uma opção/i.test(rProdBadVar.body))

  const allResponses = [r3, r12, r13, r14, r16, r17, r20, rProd, rProdSelA, rProdSelB, rProdBadVar]

  // 21. RSC/HTML nunca contém secret key
  test('21. nenhuma resposta contém a secret key', !allResponses.some((r) => r.body.includes('sb_secret')))
  // 22. nenhuma resposta contém stack trace
  test('22. nenhuma resposta contém stack trace', allResponses.every((r) => noStack(r.body)))
  // 23. nenhuma resposta contém SQL/coluna interna
  test('23. nenhuma resposta contém SQL/colunas internas', allResponses.every((r) => noLeak(r.body)))
  // 24. ZERO respostas HTTP 500 em toda a suíte
  test('24. zero HTTP 500 em toda a suíte', statuses.every((s) => s !== 500), `statuses ${statuses.join(',')}`)

  // cleanup
  await svc.from('carts').delete().eq('profile_id', me.id).eq('company_id', comp.id)
  await svc.from('inventories').update({ quantity_available: 0 }).eq('product_id', prod2.id).eq('variant_id', variant2B.id)

  console.log(`\n📊 RESULTADO HTTP CART: ${passed} PASS / ${failed} FAIL (total ${passed + failed})`)
  if (failed > 0) { console.log('\nFalhas:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1) }
  console.log('🎉 Todos os testes HTTP do carrinho passaram.')
}

main().catch((err) => { console.error('💥 FALHA GERAL HTTP:', err?.message ?? err); process.exit(1) })
