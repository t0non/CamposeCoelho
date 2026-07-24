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

const client = createClient(SUPABASE_URL, ANON_KEY)

async function run() {
  const { data } = await client.auth.signInWithPassword({ email: 'admin@atacado.com.br', password: 'DevelopmentPassword123!' })
  const tokenStr = JSON.stringify([data.session.access_token, data.session.refresh_token, null, null, null])
  console.log('Session length:', tokenStr.length)
  console.log('Cookie name prefix:', `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`)
}
run()
