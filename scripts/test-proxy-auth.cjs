const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

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

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

async function run() {
  const { data } = await client.auth.signInWithPassword({ email: 'vendedor@atacado.com.br', password: 'DevelopmentPassword123!' })
  const token = data.session.access_token
  const res = await fetch('http://localhost:3000/vendedor', {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual'
  })
  console.log('Status for /vendedor:', res.status)
  console.log('Location:', res.headers.get('location'))

  const { data: adminData } = await client.auth.signInWithPassword({ email: 'admin@atacado.com.br', password: 'DevelopmentPassword123!' })
  const resAdmin = await fetch('http://localhost:3000/admin/categorias', {
    headers: { Authorization: `Bearer ${adminData.session.access_token}` },
    redirect: 'manual'
  })
  console.log('Status for /admin/categorias:', resAdmin.status)
  console.log('Location:', resAdmin.headers.get('location'))
}
run()
