/**
 * scripts/test-rls.mjs
 * Suíte de testes de Segurança e RLS
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('💥 [ERRO EXPLÍCITO] Arquivo .env.local não foi encontrado.')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      process.env[key] = val
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let hostname = ''
try { hostname = new URL(supabaseUrl || '').hostname } catch {}

console.log('=== TESTES DE SEGURANÇA E RLS COM AUTENTICAÇÃO REAL (ETAPA 8) ===\n')
console.log(`🔍 Target Hostname: ${hostname}`)

if (!supabaseUrl || !publishableKey || hostname.includes('placeholder')) {
  console.error('💥 [ERRO EXPLÍCITO] URL do Supabase é um placeholder. Não é possível executar testes reais.')
  process.exit(1)
}

const DEFAULT_PASSWORD = 'DevelopmentPassword123!'

async function runRealRlsSuite() {
  const publicClient = createClient(supabaseUrl, publishableKey)
  const results = []

  async function getClientForUser(email) {
    const client = createClient(supabaseUrl, publishableKey)
    const { error } = await client.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD })
    if (error) throw new Error(`Falha no login real para ${email}: ${error.message}`)
    return client
  }

  function formatResult(name, user, expected, count, error, cond) {
    // Treat any technical error (like infinite recursion, syntax error) as FAIL
    if (error && error.message && error.message.toLowerCase().includes('recursion')) cond = false;
    
    results.push({
      preparacao: name,
      usuario: user,
      esperado: expected,
      recebido: `${count} linhas`,
      erro: error ? error.message : 'Nenhum',
      status: cond ? 'PASS' : 'FAIL',
    })
  }

  // 1. Visitante lendo produto público
  try {
    const { data, error } = await publicClient.from('products').select('id, name, sku').limit(5)
    formatResult('Produto público', 'Visitante', '>= 1 produto', data?.length || 0, error, !error && data?.length > 0)
  } catch (err) { formatResult('Produto público', 'Visitante', '>= 1 produto', 0, err, false) }

  // 2. Visitante impedido de ler preço existente
  try {
    const { data, error } = await publicClient.from('price_table_products').select('*')
    // We expect NO rows. If error occurs, it should ONLY be permission denied or nothing. 
    // If it's infinite recursion, it's a FAIL.
    let count = data?.length || 0
    let isExpectedBlocked = (!error && count === 0) || (error && error.code === '42501')
    if (error && error.message.toLowerCase().includes('recursion')) isExpectedBlocked = false;
    
    formatResult('Preço real cadastrado', 'Visitante', '0 linhas', count, error, isExpectedBlocked)
  } catch (err) { formatResult('Preço real cadastrado', 'Visitante', '0 linhas', 0, err, false) }

  // 3. Cliente pendente impedido de ler preço existente
  try {
    const pendenteClient = await getClientForUser('pendente@cliente.com.br')
    const { data, error } = await pendenteClient.from('price_table_products').select('*')
    let count = data?.length || 0
    let isSuccess = !error && count === 0
    if (error) isSuccess = false; // We expect NO error, just empty array for RLS block
    formatResult('Cliente pendente', 'pendente@cliente.com.br', '0 linhas (sem erro SQL)', count, error, isSuccess)
  } catch (err) { formatResult('Cliente pendente', 'pendente@cliente.com.br', '0 linhas', 0, err, false) }

  // 4. Cliente aprovado lendo sua tabela de preços existente
  try {
    const aprovadoClient = await getClientForUser('aprovado@cliente.com.br')
    const { data, error } = await aprovadoClient.from('price_table_products').select('*')
    let count = data?.length || 0
    let isSuccess = !error && count > 0
    formatResult('Cliente aprovado', 'aprovado@cliente.com.br', '>= 1 linha', count, error, isSuccess)
  } catch (err) { formatResult('Cliente aprovado', 'aprovado@cliente.com.br', '>= 1 linha', 0, err, false) }

  // 5. Cliente aprovado impedido de ler outra empresa existente
  try {
    const aprovadoClient = await getClientForUser('aprovado@cliente.com.br')
    const { data, error } = await aprovadoClient.from('companies').select('id').eq('cnpj', '98765432000110')
    let count = data?.length || 0
    let isSuccess = !error && count === 0
    if (error) isSuccess = false; // Should just return empty array
    formatResult('Isolamento de empresa', 'aprovado@cliente.com.br', '0 linhas', count, error, isSuccess)
  } catch (err) { formatResult('Isolamento de empresa', 'aprovado@cliente.com.br', '0 linhas', 0, err, false) }

  // 6. Vendedor lendo empresa atribuída
  try {
    const sellerClient = await getClientForUser('vendedor@atacado.com.br')
    const { data, error } = await sellerClient.from('companies').select('id')
    let count = data?.length || 0
    let isSuccess = !error && count >= 1
    formatResult('Vendedor carteira', 'vendedor@atacado.com.br', '>= 1 empresa', count, error, isSuccess)
  } catch (err) { formatResult('Vendedor carteira', 'vendedor@atacado.com.br', '>= 1 empresa', 0, err, false) }

  // 7. Admin lendo todas as empresas
  try {
    const adminClient = await getClientForUser('admin@atacado.com.br')
    const { data, error } = await adminClient.from('companies').select('id')
    let count = data?.length || 0
    let isSuccess = !error && count >= 3
    formatResult('Admin empresas', 'admin@atacado.com.br', '>= 3 empresas', count, error, isSuccess)
  } catch (err) { formatResult('Admin empresas', 'admin@atacado.com.br', '>= 3 empresas', 0, err, false) }

  // 8. Cliente impedido de alterar seu role
  try {
    const aprovadoClient = await getClientForUser('aprovado@cliente.com.br')
    const { data: ud } = await aprovadoClient.auth.getUser()
    const { data, error } = await aprovadoClient.from('profiles').update({ role: 'admin' }).eq('id', ud.user.id).select('id, role')
    const updatedRole = data?.[0]?.role
    // Postgres triggers or RLS block updates to role
    let isSuccess = error !== null || updatedRole !== 'admin'
    if (error && error.message.toLowerCase().includes('recursion')) isSuccess = false
    formatResult('Escalação negada', 'aprovado@cliente.com.br', 'Role inalterado ou erro esperado', data?.length || 0, error, isSuccess)
  } catch (err) { formatResult('Escalação negada', 'aprovado@cliente.com.br', 'Role inalterado', 0, err, false) }

  console.table(results)

  const allPassed = results.every((r) => r.status === 'PASS')
  if (allPassed) {
    console.log('\n🎉 TODOS OS 8 TESTES DE RLS E SEGURANÇA FORAM EXECUTADOS E APROVADOS COM 100% DE SUCESSO!')
  } else {
    console.error('\n💥 ALGUNS TESTES DE RLS FALHARAM. VERIFIQUE A TABELA ACIMA.')
    process.exit(1)
  }
}

runRealRlsSuite().catch((err) => {
  console.error('💥 [FALHA GERAL NOS TESTES RLS]:', err.message)
  process.exit(1)
})
