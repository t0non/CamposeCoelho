import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
const content = fs.readFileSync(envPath, 'utf8')

console.log('--- ENVIROMENT KEYS IN .env.local ---')
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=')
    const key = parts[0]?.trim()
    const val = parts.slice(1).join('=').trim()
    console.log(`Key found: "${key}" | Length: ${val.length}`)
  }
}
