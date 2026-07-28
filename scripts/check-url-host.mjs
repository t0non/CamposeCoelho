import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
const content = fs.readFileSync(envPath, 'utf8')
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    const val = trimmed.split('=')[1]?.trim() || ''
    try {
      const u = new URL(val)
      console.log(`[URL HOST CHECK] Hostname is: ${u.hostname}`)
    } catch {
      console.log(`[URL HOST CHECK] Invalid URL string`)
    }
  }
}
