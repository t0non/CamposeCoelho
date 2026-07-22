import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')

if (!fs.existsSync(envPath)) {
  console.log('[ENV CHECK] .env.local NÃO ENCONTRADO')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
const lines = content.split('\n')

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  'NEXT_PUBLIC_APP_URL',
  'SUPABASE_PROJECT_REF',
]

const envKeys = new Set()
for (const line of lines) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=')
    if (parts[0]) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (val.length > 0) {
        envKeys.add(key)
      }
    }
  }
}

console.log('--- VALIDAÇÃO SEGURA DE VARIÁVEIS DE AMBIENTE ---')
let allOk = true
for (const item of requiredVars) {
  if (Array.isArray(item)) {
    const found = item.find((k) => envKeys.has(k))
    if (found) {
      console.log(`✓ ${item.join(' / ')}: CONFIGURADO (${found})`)
    } else {
      console.log(`✗ ${item.join(' / ')}: AUSENTE OU VAZIO`)
      allOk = false
    }
  } else {
    if (envKeys.has(item)) {
      console.log(`✓ ${item}: CONFIGURADO`)
    } else {
      console.log(`✗ ${item}: AUSENTE OU VAZIO`)
      allOk = false
    }
  }
}

if (allOk) {
  console.log('[ENV CHECK RESULT] Todas as 5 variáveis de ambiente exigidas estão presentes e preenchidas.')
} else {
  console.log('[ENV CHECK RESULT] Alguma variável está ausente.')
}
