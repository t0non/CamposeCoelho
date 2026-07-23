/**
 * scripts/test-http-admin-catalog.mjs
 * Suíte de testes HTTP para validação de acesso e isolamento das rotas administrativas do catálogo (/admin/*).
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

async function loginAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) {
    throw new Error(`Falha no login para ${email}: ${error?.message}`)
  }
  return data.session
}

async function runAdminHttpTests() {
  console.log(`🔒 Executando testes HTTP de rotas administrativas contra ${BASE_URL}...\n`)

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

  const adminSession = await loginAs('admin@atacado.com.br')
  const customerSession = await loginAs('aprovado@cliente.com.br')

  const adminRoutes = [
    '/admin/categorias',
    '/admin/marcas',
    '/admin/produtos',
    '/admin/estoque',
    '/admin/tabelas-de-precos',
  ]

  // 1. Visitante anônimo é redirecionado ao tentar acessar rotas admin
  for (const route of adminRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: 'manual' })
    test(`Anon redirecionado ao acessar ${route}`, res.status === 307 || res.status === 302 || res.status === 308)
  }

  // 2. Customer é redirecionado ao tentar acessar rotas admin
  for (const route of adminRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: { Authorization: `Bearer ${customerSession.access_token}` },
      redirect: 'manual',
    })
    test(`Customer redirecionado ao acessar ${route}`, res.status === 307 || res.status === 302 || res.status === 308 || res.status === 403)
  }

  // 3. Admin acessa rotas administrativas com HTTP 200
  for (const route of adminRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: { Authorization: `Bearer ${adminSession.access_token}` },
    })
    test(`Admin acessa ${route} com HTTP 200`, res.status === 200)
  }

  console.log(`\n📊 RESULTADO TESTES HTTP ADMIN: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runAdminHttpTests().catch((err) => {
  console.error('💥 Erro ao executar suíte HTTP administrativa:', err.message)
  process.exit(1)
})
