import { createServerClient } from '@supabase/ssr'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'dummy'

const mockCookies = {}

const client = createServerClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() { return Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v })) },
    setAll(cookies) { cookies.forEach(c => mockCookies[c.name] = c.value) }
  }
})

async function run() {
  await client.auth.setSession({ access_token: 'dummy_access', refresh_token: 'dummy_refresh' })
  console.log(mockCookies)
}
run()
