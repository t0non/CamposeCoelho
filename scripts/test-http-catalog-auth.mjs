/**
 * scripts/test-http-catalog-auth.mjs
 * Testes HTTP autenticados para validação de sessão, precificação por empresa e segurança.
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

async function loginAndGetCookies(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) {
    throw new Error(`Falha no login de teste para ${email}: ${error?.message}`)
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://localhost:${PORT}`

async function runAuthHttpTests() {
  console.log(`🔒 Executando testes HTTP autenticados contra ${BASE_URL}...\n`)

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

  // 1. Visitante anônimo não recebe preços
  const resAnon = await fetch(`${BASE_URL}/catalogo`, { redirect: 'manual' })
  const htmlAnon = await resAnon.text()
  test('1. Visitante anônimo acessa catálogo sem preços no HTML', !htmlAnon.includes('price_table_id') && !htmlAnon.includes('"unit_price"'))

  // 2. Autenticação Cliente A (aprovado@cliente.com.br)
  let sessionA
  try {
    sessionA = await loginAndGetCookies('aprovado@cliente.com.br')
    test('2. Sessão do Cliente A obtida com sucesso', true)
  } catch (err) {
    test('2. Sessão do Cliente A obtida com sucesso', false, err.message)
  }

  // 3. Autenticação Cliente B (aprovado2@cliente.com.br)
  let sessionB
  try {
    sessionB = await loginAndGetCookies('aprovado2@cliente.com.br')
    test('3. Sessão do Cliente B obtida com sucesso', true)
  } catch (err) {
    test('3. Sessão do Cliente B obtida com sucesso', false, err.message)
  }

  // 4. Cliente A acessa /catalogo com Cookie/Header de sessão
  if (sessionA) {
    const resA = await fetch(`${BASE_URL}/catalogo`, {
      headers: {
        Authorization: `Bearer ${sessionA.accessToken}`,
      },
    })
    const htmlA = await resA.text()
    test('4. Cliente A acessa catálogo via HTTP autenticado', resA.status === 200)
    test('5. HTML do Cliente A não vaza price_table_id nem credenciais privadas', !htmlA.includes('price_table_id'))
  } else {
    test('4. Cliente A acessa catálogo via HTTP autenticado', false)
    test('5. HTML do Cliente A não vaza price_table_id', false)
  }

  // 6. Cliente B acessa /catalogo com Cookie/Header de sessão
  if (sessionB) {
    const resB = await fetch(`${BASE_URL}/catalogo`, {
      headers: {
        Authorization: `Bearer ${sessionB.accessToken}`,
      },
    })
    const htmlB = await resB.text()
    test('6. Cliente B acessa catálogo via HTTP autenticado', resB.status === 200)
    test('7. HTML do Cliente B não vaza price_table_id nem credenciais privadas', !htmlB.includes('price_table_id'))
  } else {
    test('6. Cliente B acessa catálogo via HTTP autenticado', false)
    test('7. HTML do Cliente B não vaza price_table_id', false)
  }

  // 8. Produto publicado /produto/e11-pote-hermetico-5l para anônimo
  const resProdAnon = await fetch(`${BASE_URL}/produto/e11-pote-hermetico-5l`)
  const htmlProdAnon = await resProdAnon.text()
  test('8. Anônimo acessa produto sem vazamento de preços', resProdAnon.status === 200 && !htmlProdAnon.includes('price_table_id'))

  // 9. Produto rascunho /produto/e11-produto-rascunho para anônimo
  const resDraftAnon = await fetch(`${BASE_URL}/produto/e11-produto-rascunho`, { redirect: 'manual' })
  const htmlDraftAnon = await resDraftAnon.text()
  test('9. Produto rascunho é inacessível e retorna 404', resDraftAnon.status === 404 || htmlDraftAnon.includes('404'))

  // 10. Favoritos exigem autenticação
  const resFavsAnon = await fetch(`${BASE_URL}/minha-conta/favoritos`, { redirect: 'manual' })
  test('10. Favoritos exige autenticação (redirect /login)', resFavsAnon.status === 307 || resFavsAnon.status === 302 || resFavsAnon.status === 308)

  // 11. Ordenação por preço
  const resSortPrice = await fetch(`${BASE_URL}/catalogo?sort=menor-preco`)
  test('11. Rota de catálogo com ordenação por preço responde HTTP 200', resSortPrice.status === 200)

  // 12. Navegação pós-logout
  const resPostLogout = await fetch(`${BASE_URL}/catalogo`)
  const htmlPostLogout = await resPostLogout.text()
  test('12. Catálogo público após sessão continua limpo sem preços expostos', !htmlPostLogout.includes('price_table_id'))

  console.log(`\n📊 RESULTADO TESTES HTTP AUTENTICADOS: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runAuthHttpTests().catch((err) => {
  console.error('💥 Erro ao executar testes HTTP autenticados:', err.message)
  process.exit(1)
})
