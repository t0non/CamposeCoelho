const fs = require('fs')
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf-8')
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=')
      if (key && val.length > 0) process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}
const { createClient } = require('@supabase/supabase-js')
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
async function run() {
  const { data } = await client.from('product_variants').select('id, sku').eq('sku', 'E11-VAR-001A').single()
  if (data) {
    await client.from('inventories').update({quantity_available: 100}).eq('variant_id', data.id)
    console.log('Reset done')
  }
}
run()
