import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

async function test() {
  const c = createClient(SUPABASE_URL, ANON_KEY)
  
  // Login as seller
  const { data: sd, error: se } = await c.auth.signInWithPassword({email: 'vendedor@atacado.com.br', password: 'DevelopmentPassword123!'})
  const sellerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${sd.session.access_token}` } } })
  const r1 = await sellerClient.from('companies').select('*')
  console.log("Seller companies:", r1.error ? r1.error.message : r1.data.length)

  const { data: cd, error: ce } = await c.auth.signInWithPassword({email: 'aprovado@cliente.com.br', password: 'DevelopmentPassword123!'})
  const customerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${cd.session.access_token}` } } })
  const r2 = await customerClient.from('price_table_products').select('*')
  console.log("Customer prices:", r2.error ? r2.error.message : r2.data.length)
}
test()
