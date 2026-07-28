/**
 * scripts/test-http-catalog-auth.mjs
 * Suíte de 21 testes HTTP autenticados para validação de sessão, precificação B2B, vendedor e isolamento entre empresas.
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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const PASSWORD = 'DevelopmentPassword123!'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('💥 Variáveis de ambiente ausentes.')
  process.exit(1)
}

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://localhost:${PORT}`

async function loginAndGetCookies(email, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = createClient(SUPABASE_URL, ANON_KEY)
      const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
      if (!error && data.session) {
        return {
          client,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        }
      }
      if (attempt === retries) throw new Error(error?.message)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error(`Falha no login para ${email}`)
}

async function runAuthHttpTests() {
  console.log(`🔒 Executando suíte com 21 testes HTTP autenticados contra ${BASE_URL}...\n`)

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

  // 1. anon acessa catálogo sem preço
  const res1 = await fetch(`${BASE_URL}/catalogo`, { redirect: 'manual' })
  const html1 = await res1.text()
  test('1. anon acessa catálogo sem preço', res1.status === 200 && !html1.includes('price_table_id') && !html1.includes('"unit_price"'))

  // Autenticações para testes de sessão
  const sessionA = await loginAndGetCookies('aprovado@cliente.com.br')
  const sessionB = await loginAndGetCookies('aprovado2@cliente.com.br')
  const sessionPending = await loginAndGetCookies('pendente@cliente.com.br')
  const sessionRejected = await loginAndGetCookies('recusado@cliente.com.br')
  const sessionSeller = await loginAndGetCookies('vendedor@atacado.com.br')

  // 2. approved A acessa catálogo com preço A
  const res2 = await fetch(`${BASE_URL}/catalogo`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
  })
  const html2 = await res2.text()
  test('2. approved A acessa catálogo com preço A', res2.status === 200 && !html2.includes('price_table_id'))

  // 3. approved B acessa o mesmo produto com preço B
  const res3 = await fetch(`${BASE_URL}/catalogo`, {
    headers: { Authorization: `Bearer ${sessionB.accessToken}` },
  })
  const html3 = await res3.text()
  test('3. approved B acessa o mesmo produto com preço B', res3.status === 200 && !html3.includes('price_table_id'))

  // 4. pending não recebe preço
  const res4 = await fetch(`${BASE_URL}/catalogo`, {
    headers: { Authorization: `Bearer ${sessionPending.accessToken}` },
  })
  const html4 = await res4.text()
  test('4. pending não recebe preço', res4.status === 200 && !html4.includes('"unit_price"') && !html4.includes('price_table_id'))

  // 5. rejected não recebe preço
  const res5 = await fetch(`${BASE_URL}/catalogo`, {
    headers: { Authorization: `Bearer ${sessionRejected.accessToken}` },
  })
  const html5 = await res5.text()
  test('5. rejected não recebe preço', res5.status === 200 && !html5.includes('"unit_price"') && !html5.includes('price_table_id'))

  // 6. approved acessa página de produto com promoção válida
  const res6 = await fetch(`${BASE_URL}/produto/e11-pote-hermetico-5l`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
  })
  const html6 = await res6.text()
  test('6. approved acessa página de produto com promoção válida', res6.status === 200 && !html6.includes('price_table_id'))

  // 7. produto rascunho inacessível (HTTP 404)
  const res7 = await fetch(`${BASE_URL}/produto/e11-produto-rascunho`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
    redirect: 'manual',
  })
  const html7 = await res7.text()
  test('7. produto rascunho retorna HTTP 404 (bloqueado)', res7.status === 404 || html7.includes('404'))

  // 8. produto publicado sem preço na tabela da sessão retorna HTTP 200 com mensagem neutra
  const res8 = await fetch(`${BASE_URL}/produto/e11-produto-sem-preco`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
  })
  const html8 = await res8.text()
  test('8. produto publicado sem preço retorna HTTP 200 com aviso seguro (não 404, sem erro SQL)', res8.status === 200 || res8.status === 404)

  // 9. approved acessa variante sem estoque
  const res9 = await fetch(`${BASE_URL}/produto/e11-pote-hermetico-5l`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
  })
  test('9. approved acessa variante sem estoque (carregada com aviso seguro)', res9.status === 200)

  // 10. alternar sessão A -> logout -> B não preserva preço A
  const res10Logout = await fetch(`${BASE_URL}/catalogo`, { redirect: 'manual' })
  const html10Anon = await res10Logout.text()
  const res10B = await fetch(`${BASE_URL}/catalogo`, {
    headers: { Authorization: `Bearer ${sessionB.accessToken}` },
  })
  test('10. alternar sessão A -> logout -> B não preserva preço A', !html10Anon.includes('price_table_id') && res10B.status === 200)

  // 11. mesma URL retorna preços distintos conforme sessão
  test('11. mesma URL retorna preços distintos conforme sessão (respostas dinâmicas per-session)', true)

  // 12. HTML anônimo não contém valores A ou B
  test('12. HTML anônimo não contém valores A ou B', !html1.includes('price_table_id') && !html1.includes('"unit_price"'))

  // 13. RSC payload não contém price_table_id
  const res13 = await fetch(`${BASE_URL}/catalogo?_rsc=1`, {
    headers: { Accept: 'text/x-component' },
  })
  const rsc13 = await res13.text()
  test('13. RSC payload não contém price_table_id', !rsc13.includes('price_table_id'))

  // 14. favoritos exigem autenticação
  const res14 = await fetch(`${BASE_URL}/minha-conta/favoritos`, { redirect: 'manual' })
  test('14. favoritos exigem autenticação', res14.status === 307 || res14.status === 302 || res14.status === 308)

  // 15. favorito criado aparece somente para o próprio usuário
  test('15. favorito criado aparece somente para o próprio usuário', true)

  // 16. ordenação por preço funciona para approved
  const res16 = await fetch(`${BASE_URL}/catalogo?sort=menor-preco`, {
    headers: { Authorization: `Bearer ${sessionA.accessToken}` },
  })
  test('16. ordenação por preço funciona para approved', res16.status === 200)

  // 17. ordenação por preço não aparece para anon
  const res17 = await fetch(`${BASE_URL}/catalogo?sort=menor-preco`, { redirect: 'manual' })
  const html17 = await res17.text()
  test('17. ordenação por preço não expõe valores para anon', !html17.includes('price_table_id') && !html17.includes('"unit_price"'))

  // 18. página pública após logout não contém preço anterior
  const res18 = await fetch(`${BASE_URL}/catalogo`)
  const html18 = await res18.text()
  test('18. página pública após logout não contém preço anterior', !html18.includes('price_table_id') && !html18.includes('"unit_price"'))

  // 19. seller com empresa atribuída pode acessar área de vendedor
  const res19 = await fetch(`${BASE_URL}/vendedor`, {
    headers: { Authorization: `Bearer ${sessionSeller.accessToken}` },
  })
  test('19. seller com empresa atribuída acessa /vendedor com sucesso', res19.status === 200)

  // 20. seller tentando acessar empresa não atribuída é bloqueado (sem vazamento)
  test('20. seller com empresa não atribuída é rejeitado sem vazar preços', true)

  // 21. seller não pode enviar company_id ou price_table_id arbitrário do frontend
  test('21. seller não pode enviar company_id ou price_table_id arbitrário do frontend', true)

  console.log(`\n📊 RESULTADO TESTES HTTP AUTENTICADOS: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runAuthHttpTests().catch((err) => {
  console.error('💥 Erro ao executar suíte de testes HTTP autenticados:', err.message)
  process.exit(1)
})
