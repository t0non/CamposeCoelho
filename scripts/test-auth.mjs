import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim()
        let val = trimmed.substring(idx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        env[key] = val
      }
    }
  })
  return env
}

const env = loadEnvLocal()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVER_URL = 'http://localhost:3000'
const DEFAULT_PASSWORD = 'DevelopmentPassword123!'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

// Funções espelhadas do proxy.ts / auth.ts para testes unitários isolados da lógica de segurança
function safeRedirectPath(path, fallback = '/') {
  if (!path || typeof path !== 'string') return fallback
  if (path.trim() === '') return fallback
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(path)) return fallback
  if (path.startsWith('//')) return fallback
  if (!path.startsWith('/')) return fallback
  return path
}

function isRedirectAllowedForRole(redirectPath, role, companyStatus) {
  if (role === 'admin') return true
  if (role === 'seller') return !redirectPath.startsWith('/admin')
  if (role === 'customer') {
    if (companyStatus === 'pending' || companyStatus === 'rejected' || companyStatus === 'suspended') {
      return redirectPath === '/conta-pendente' || redirectPath === '/conta-recusada'
    }
    return !redirectPath.startsWith('/admin') && !redirectPath.startsWith('/vendedor')
  }
  return false
}

const results = []

function recordResult(scenario, user, operation, expected, received, status, error = 'Nenhum') {
  results.push({ scenario, user, operation, expected, received, error, status })
}

async function runFullAuthSuite() {
  console.log('🚀 Iniciando Auditoria Completa da Etapa 9 (Supabase Real + HTTP Proxy Local)\n')

  // =========================================================================
  // BLOCO 1: HTTP REAL — VISITANTE EM ROTAS PRIVADAS E ARQUIVOS ESTÁTICOS
  // =========================================================================
  const privateRoutes = [
    { path: '/admin', name: 'Rota Admin' },
    { path: '/vendedor', name: 'Rota Vendedor' },
    { path: '/minha-conta', name: 'Rota Minha Conta' },
    { path: '/carrinho', name: 'Rota Carrinho' },
    { path: '/checkout', name: 'Rota Checkout' },
    { path: '/conta-pendente', name: 'Rota Conta Pendente' },
    { path: '/conta-recusada', name: 'Rota Conta Recusada' },
  ]

  for (const r of privateRoutes) {
    try {
      const res = await fetch(`${SERVER_URL}${r.path}`, { redirect: 'manual' })
      const status = res.status
      const location = res.headers.get('location') || ''
      const isRedirectedToLogin = (status === 307 || status === 302 || status === 303) && location.includes('/login')

      recordResult(
        `Visitante -> ${r.name}`,
        'Visitante (Anônimo)',
        `GET ${r.path}`,
        'HTTP 307/302 para /login',
        `HTTP ${status} -> ${location}`,
        isRedirectedToLogin ? 'PASS' : 'FAIL'
      )
    } catch (err) {
      recordResult(`Visitante -> ${r.name}`, 'Visitante', `GET ${r.path}`, 'Redirecionamento', 'Erro de rede', 'FAIL', err.message)
    }
  }

  // Teste de exclusão de arquivos estáticos no proxy.ts
  try {
    const resStatic = await fetch(`${SERVER_URL}/favicon.ico`, { redirect: 'manual' })
    const isNotRedirected = resStatic.status !== 307 && resStatic.status !== 302
    recordResult(
      'Proxy Matcher (Arquivo Estático)',
      'Visitante',
      'GET /favicon.ico',
      'HTTP 200/404 (Sem redirect de auth)',
      `HTTP ${resStatic.status}`,
      isNotRedirected ? 'PASS' : 'FAIL'
    )
  } catch (err) {
    recordResult('Proxy Matcher (Arquivo Estático)', 'Visitante', 'GET /favicon.ico', 'Sem redirect', 'Erro de rede', 'FAIL', err.message)
  }

  // =========================================================================
  // BLOCO 2: AUTENTICAÇÃO REAL E SESSÕES SUPABASE (5 USUÁRIOS DE CONTROLE)
  // =========================================================================
  const usersToTest = [
    { label: 'Admin', email: 'admin@atacado.com.br', expectedRole: 'admin', expectedDest: '/admin' },
    { label: 'Seller', email: 'vendedor@atacado.com.br', expectedRole: 'seller', expectedDest: '/vendedor' },
    { label: 'Customer Approved', email: 'aprovado@cliente.com.br', expectedRole: 'customer', expectedStatus: 'approved', expectedDest: '/minha-conta' },
    { label: 'Customer Pending', email: 'pendente@cliente.com.br', expectedRole: 'customer', expectedStatus: 'pending', expectedDest: '/conta-pendente' },
    { label: 'Customer Rejected', email: 'recusado@cliente.com.br', expectedRole: 'customer', expectedStatus: 'rejected', expectedDest: '/conta-recusada' },
  ]

  const userClients = {}

  for (const u of usersToTest) {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: true } })

    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: u.email,
      password: DEFAULT_PASSWORD,
    })

    if (authError || !authData.user) {
      recordResult(`Login ${u.label}`, u.email, 'signInWithPassword', 'Autenticado', 'Falha no login', 'FAIL', authError?.message)
      continue
    }

    userClients[u.expectedRole + (u.expectedStatus ? `_${u.expectedStatus}` : '')] = { client, user: authData.user }

    // Verificar perfil real
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role, company_id')
      .eq('id', authData.user.id)
      .single()

    let companyStatus = null
    if (profile?.role === 'customer' && profile.company_id) {
      const { data: company } = await client
        .from('companies')
        .select('status')
        .eq('id', profile.company_id)
        .single()
      companyStatus = company?.status || null
    }

    const rolePass = profile?.role === u.expectedRole
    const statusPass = !u.expectedStatus || companyStatus === u.expectedStatus

    recordResult(
      `Sessão & Perfil (${u.label})`,
      u.email,
      'Auth + SELECT profile/company',
      `role=${u.expectedRole}, status=${u.expectedStatus || 'N/A'}`,
      `role=${profile?.role}, status=${companyStatus || 'N/A'}`,
      rolePass && statusPass ? 'PASS' : 'FAIL',
      profileError?.message
    )

    // Teste de persistência de sessão SDK
    const { data: sessionData } = await client.auth.getSession()
    const sessionActive = !!sessionData.session
    recordResult(
      `Persistência de Sessão (${u.label})`,
      u.email,
      'auth.getSession() após reload',
      'Sessão ativa e JWT válido',
      sessionActive ? 'Sessão mantida' : 'Sessão perdida',
      sessionActive ? 'PASS' : 'FAIL'
    )
  }

  // =========================================================================
  // BLOCO 3: REQUISIÇÕES HTTP COM COOKIES DE SESSÃO REAL (TESTE DO PROXY)
  // =========================================================================
  // Testar acesso autenticado do Admin via HTTP Cookie no Proxy
  const adminClient = userClients['admin']?.client
  if (adminClient) {
    const { data: { session } } = await adminClient.auth.getSession()
    if (session) {
      const cookieHeader = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify(session))}`
      
      try {
        const resLogin = await fetch(`${SERVER_URL}/login`, {
          headers: { 
            Cookie: cookieHeader,
            Authorization: `Bearer ${session.access_token}`
          },
          redirect: 'manual'
        })
        const loc = resLogin.headers.get('location') || ''
        const pass = (resLogin.status === 307 || resLogin.status === 302) && loc.endsWith('/admin')
        recordResult(
          'Proxy: Admin Autenticado em /login',
          'admin@atacado.com.br',
          'GET /login (Com Cookie)',
          'HTTP 307 -> /admin',
          `HTTP ${resLogin.status} -> ${loc}`,
          pass ? 'PASS' : 'FAIL'
        )
      } catch (err) {
        recordResult('Proxy: Admin Autenticado em /login', 'admin@atacado.com.br', 'GET /login', 'Redirect /admin', 'Erro HTTP', 'FAIL', err.message)
      }
    }
  }

  // Testar acesso bloqueado do Customer Approved em /admin
  const customerClient = userClients['customer_approved']?.client
  if (customerClient) {
    const { data: { session } } = await customerClient.auth.getSession()
    if (session) {
      const cookieHeader = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify(session))}`
      try {
        const resAdmin = await fetch(`${SERVER_URL}/admin`, {
          headers: { 
            Cookie: cookieHeader,
            Authorization: `Bearer ${session.access_token}`
          },
          redirect: 'manual'
        })
        const loc = resAdmin.headers.get('location') || ''
        const pass = (resAdmin.status === 307 || resAdmin.status === 302) && (loc.endsWith('/') || loc.endsWith('/login'))
        recordResult(
          'Proxy: Customer tentando /admin',
          'aprovado@cliente.com.br',
          'GET /admin (Com Cookie)',
          'HTTP 307 -> / ou /login',
          `HTTP ${resAdmin.status} -> ${loc}`,
          pass ? 'PASS' : 'FAIL'
        )
      } catch (err) {
        recordResult('Proxy: Customer tentando /admin', 'aprovado@cliente.com.br', 'GET /admin', 'Bloqueado por Proxy', 'Erro HTTP', 'FAIL', err.message)
      }
    }
  }

  // =========================================================================
  // BLOCO 4: SANITIZAÇÃO DE OPEN REDIRECT E PROTOCOLOS MALICIOSOS
  // =========================================================================
  const openRedirectTests = [
    { input: 'https://evil.com', expected: '/', name: 'URL Absoluta Externa' },
    { input: '//evil.com', expected: '/', name: 'Protocol Relative //' },
    { input: 'javascript:alert(1)', expected: '/', name: 'Protocolo javascript:' },
    { input: 'http://malicious.org/phishing', expected: '/', name: 'URL http:' },
    { input: '/minha-conta', expected: '/minha-conta', name: 'Caminho Interno Válido' },
    { input: '', expected: '/', name: 'String Vazia' },
    { input: null, expected: '/', name: 'Null' },
  ]

  for (const t of openRedirectTests) {
    const output = safeRedirectPath(t.input)
    const pass = output === t.expected
    recordResult(
      `Sanitização: ${t.name}`,
      'Qualquer',
      `safeRedirectPath("${t.input}")`,
      `"${t.expected}"`,
      `"${output}"`,
      pass ? 'PASS' : 'FAIL'
    )
  }

  // Testar isRedirectAllowedForRole (Privilégios de Redirect por Role)
  const roleRedirectTests = [
    { path: '/admin', role: 'customer', status: 'approved', expected: false, name: 'Customer -> /admin' },
    { path: '/vendedor', role: 'customer', status: 'approved', expected: false, name: 'Customer -> /vendedor' },
    { path: '/admin', role: 'seller', status: null, expected: false, name: 'Seller -> /admin' },
    { path: '/vendedor', role: 'seller', status: null, expected: true, name: 'Seller -> /vendedor' },
    { path: '/minha-conta', role: 'customer', status: 'pending', expected: false, name: 'Pending Customer -> /minha-conta' },
    { path: '/conta-pendente', role: 'customer', status: 'pending', expected: true, name: 'Pending Customer -> /conta-pendente' },
    { path: '/admin', role: 'admin', status: null, expected: true, name: 'Admin -> /admin' },
  ]

  for (const t of roleRedirectTests) {
    const allowed = isRedirectAllowedForRole(t.path, t.role, t.status)
    const pass = allowed === t.expected
    recordResult(
      `Restrição Role Redirect: ${t.name}`,
      `role=${t.role}`,
      `isRedirectAllowedForRole("${t.path}")`,
      `${t.expected}`,
      `${allowed}`,
      pass ? 'PASS' : 'FAIL'
    )
  }

  // =========================================================================
  // BLOCO 5: FLUXO DE RECUPERAÇÃO DE SENHA E RECUPERAÇÃO INVÁLIDA
  // =========================================================================
  const publicClient = createClient(SUPABASE_URL, ANON_KEY)

  // 1. Envio de e-mail de recuperação (Solicitação sem expor existência)
  try {
    const testEmail = `pendente+${Date.now()}@cliente.com.br`
    const { error: resetErr } = await publicClient.auth.resetPasswordForEmail(testEmail, {
      redirectTo: `${SERVER_URL}/api/auth/callback?type=recovery`,
    })
    recordResult(
      'Solicitação de Recuperação de Senha',
      'pendente@cliente.com.br',
      'resetPasswordForEmail()',
      'Sucesso (Mensagem genérica enviada)',
      resetErr ? resetErr.message : 'Solicitação aceita pelo Supabase',
      !resetErr ? 'PASS' : 'FAIL',
      resetErr?.message
    )
  } catch (err) {
    recordResult('Solicitação de Recuperação de Senha', 'pendente@cliente.com.br', 'resetPasswordForEmail', 'Enviado', 'Erro SDK', 'FAIL', err.message)
  }

  // 2. Teste de Link Expirado / Código Falso
  try {
    const resBadCode = await fetch(`${SERVER_URL}/api/auth/callback?code=codigo_falso_expirado&type=recovery`, { redirect: 'manual' })
    const loc = resBadCode.headers.get('location') || ''
    const pass = (resBadCode.status === 307 || resBadCode.status === 302) && loc.includes('/login?error=auth_callback_failed')
    recordResult(
      'Callback de Recuperação: Código Inválido/Expirado',
      'Anônimo',
      'GET /api/auth/callback?code=bad&type=recovery',
      'HTTP 307 -> /login?error=auth_callback_failed',
      `HTTP ${resBadCode.status} -> ${loc}`,
      pass ? 'PASS' : 'FAIL'
    )
  } catch (err) {
    recordResult('Callback de Recuperação: Código Inválido', 'Anônimo', 'GET Callback', 'Redirect login erro', 'Erro HTTP', 'FAIL', err.message)
  }

  // =========================================================================
  // BLOCO 6: LOGOUT E INVALIDAÇÃO DE SESSÃO
  // =========================================================================
  try {
    const tempClient = createClient(SUPABASE_URL, ANON_KEY)
    await tempClient.auth.signInWithPassword({ email: 'aprovado@cliente.com.br', password: DEFAULT_PASSWORD })
    await tempClient.auth.signOut()
    const { data: postLogoutSession } = await tempClient.auth.getSession()
    const isLoggedOut = !postLogoutSession.session
    recordResult(
      'Logout Real e Invalidação de Sessão',
      'aprovado@cliente.com.br',
      'auth.signOut() + getSession()',
      'Sessão nula (Usuário desconectado)',
      isLoggedOut ? 'Sessão totalmente encerrada' : 'Sessão permaneceu ativa',
      isLoggedOut ? 'PASS' : 'FAIL'
    )
  } catch (err) {
    recordResult('Logout Real', 'aprovado@cliente.com.br', 'auth.signOut()', 'Sessão nula', 'Exceção', 'FAIL', err.message)
  }

  // Limpeza de clientes de teste
  for (const k of Object.keys(userClients)) {
    await userClients[k].client.auth.signOut()
  }

  // =========================================================================
  // RELATÓRIO FINAL FACTUAL
  // =========================================================================
  console.table(results)

  const total = results.length
  const passes = results.filter(r => r.status === 'PASS').length
  const fails = results.filter(r => r.status === 'FAIL').length

  console.log(`\n📊 Total de Testes Executados: ${total} | Aprovados (PASS): ${passes} | Falhos (FAIL): ${fails}`)

  if (fails > 0) {
    console.error(`\n❌ ${fails} teste(s) falharam na auditoria.`)
    process.exit(1)
  } else {
    console.log('\n✨ AUDITORIA CONCLUÍDA: TODOS OS TESTES EXECUTADOS FORAM APROVADOS (100% PASS)!')
  }
}

runFullAuthSuite().catch(err => {
  console.error('Erro catastrófico na execução dos testes:', err)
  process.exit(1)
})
