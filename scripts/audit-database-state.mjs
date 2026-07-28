import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Carregar .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('=== AUDITORIA DE CONEXÃO E ESTADO DO BANCO SUPABASE ===\n')

let hostname = 'desconhecido'
try {
  hostname = new URL(supabaseUrl || '').hostname
} catch {}

console.log(`[CONEXÃO] Hostname configurado: ${hostname}`)

if (!supabaseUrl || !serviceRoleKey || hostname === 'placeholder.supabase.co') {
  console.log('\n⚠️ [STATUS DO BANCO] O arquivo .env.local ainda contém a URL genérica "placeholder.supabase.co".')
  console.log('💡 A conexão com o Supabase remoto requer que o usuário insira a URL real do seu projeto (ex: https://xxx.supabase.co) no .env.local.')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function audit() {
  // 1. Contagem em auth.users
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
  const authCount = authUsers?.users?.length ?? 0

  // 2. Contagem em public.profiles
  const { count: profilesCount, error: profErr } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 3. Contagem em public.companies
  const { count: companiesCount, error: compErr } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  // 4. Contagem em public.company_members
  const { count: membersCount, error: memErr } = await supabase
    .from('company_members')
    .select('*', { count: 'exact', head: true })

  console.log('--- CONTAGEM DE REGISTROS APÓS O SEED ---')
  console.log(`- Usuários em Supabase Auth (auth.users): ${authCount}`)
  console.log(`- Perfis (public.profiles): ${profilesCount ?? 0}`)
  console.log(`- Empresas (public.companies): ${companiesCount ?? 0}`)
  console.log(`- Membros (public.company_members): ${membersCount ?? 0}`)

  if (authErr || profErr || compErr || memErr) {
    console.log('\nNotice de erros:', { authErr, profErr, compErr, memErr })
  }
}

audit().catch((err) => {
  console.error('Erro na auditoria:', err.message)
})
