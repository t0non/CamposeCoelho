import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Carregar .env.local de forma autoritativa
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
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !secretKey) {
  console.error('💥 [ERRO EXPLÍCITO] URL ou SECRET_KEY ausente.')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function getCounts() {
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const { count: profilesCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
  const { count: companiesCount } = await supabaseAdmin.from('companies').select('*', { count: 'exact', head: true })
  const { count: prodCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('sku', 'PROD-TESTE-001')
  const { count: varCount } = await supabaseAdmin.from('product_variants').select('*', { count: 'exact', head: true }).eq('sku', 'VAR-TESTE-001')
  const { count: ptCount } = await supabaseAdmin.from('price_tables').select('*', { count: 'exact', head: true }).eq('is_default', true)
  const { count: ptpCount } = await supabaseAdmin.from('price_table_products').select('*', { count: 'exact', head: true })
  const { count: membersCount } = await supabaseAdmin.from('company_members').select('*', { count: 'exact', head: true })

  return {
    testUsers: authUsers?.users?.length ?? 0,
    testProfiles: profilesCount ?? 0,
    testCompanies: companiesCount ?? 0,
    prodCount: prodCount ?? 0,
    varCount: varCount ?? 0,
    ptCount: ptCount ?? 0,
    ptpCount: ptpCount ?? 0,
    membersCount: membersCount ?? 0,
  }
}

async function main() {
  const counts = await getCounts()
  console.log(JSON.stringify(counts, null, 2))
}

if (process.argv[1]?.endsWith('verify-idempotency.mjs')) {
  main()
}
