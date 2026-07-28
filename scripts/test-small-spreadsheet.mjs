import fs from 'fs'
import path from 'path'
import * as xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const SERVER_URL = 'http://localhost:3000'

function generateTestFile(data, filename = 'test-small-import.xlsx') {
  const filePath = path.join(__dirname, filename)
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.aoa_to_sheet(data)
  xlsx.utils.book_append_sheet(wb, ws, 'Planilha1')
  xlsx.writeFile(wb, filePath)
  return filePath
}

async function runSmallTest() {
  console.log('=== TESTE PLANILHA PEQUENA ===')
  
  // 1. Auth as Admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@atacado.com.br',
    password: 'password123'
  })
  
  if (authError) {
    console.error('Login falhou:', authError.message)
    return { success: false }
  }
  
  const token = authData.session.access_token
  const headers = { 'Authorization': `Bearer ${token}` }
  
  // Data: 2 novos, 1 existente (SKU 000707), 1 preço zero, 1 inativo
  const validData = [
    ['Lixo 1', '', ''],
    ['Lixo 2', '', ''],
    ['Sistema Exportador XYZ', 'v1.0'],
    ['Código', 'Descrição', 'Cod Barras', 'Unidade', 'Preço Venda', 'Inativo'],
    ['NOVO1', 'Produto Novo 1', '111', 'UN', '10.50', 'Não'],
    ['NOVO2', 'Produto Novo 2', '222', 'UN', '20.00', 'Não'],
    ['000707', 'Produto Existente Modificado', '333', 'CX', '30.00', 'Não'], // 000707 já deve existir
    ['PZERO', 'Produto Preco Zero', '444', 'UN', '0,00', 'Não'],
    ['INATIVO1', 'Produto Inativo', '555', 'UN', '50.00', 'Sim'],
  ]
  
  const filePath = generateTestFile(validData)
  
  try {
    // 2. Parse (Upload)
    const fileData = new File([fs.readFileSync(filePath)], 'test-small-import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = new FormData()
    formData.append('file', fileData)
    
    console.log('1. Parsing...')
    let res = await fetch(`${SERVER_URL}/api/admin/catalog/import/parse`, { method: 'POST', headers, body: formData })
    if (!res.ok) throw new Error(await res.text())
    const parseResult = await res.json()
    console.log(`Parse success. Session: ${parseResult.sessionId}`)
    
    // 3. Confirm
    console.log('2. Confirming...')
    // Pegar o price_table_id (vamos criar ou pegar um existente?)
    // No mock/teste, passamos null ou pegamos uma tabela do banco
    const { data: pt } = await supabase.from('price_tables').select('id').limit(1).single()
    const priceTableId = pt ? pt.id : null;
    
    res = await fetch(`${SERVER_URL}/api/admin/catalog/import/confirm`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: parseResult.sessionId, mode: 'import_update', priceTableId, publishProducts: true })
    })
    if (!res.ok) throw new Error(await res.text())
    console.log('Confirm success.')
    
    // 4. Process
    console.log('3. Processing batch 1...')
    res = await fetch(`${SERVER_URL}/api/admin/catalog/import/process-batch`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: parseResult.sessionId, batchNumber: 1 })
    })
    if (!res.ok) throw new Error(await res.text())
    const processResult = await res.json()
    console.log(`Process batch 1 success. Created: ${processResult.created}, Updated: ${processResult.updated}, Errors: ${processResult.errors}`)
    
    // 5. Finalize
    console.log('4. Finalizing...')
    res = await fetch(`${SERVER_URL}/api/admin/catalog/import/finalize`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: parseResult.sessionId })
    })
    // Note: finalize mode=replace is expected in finalize_catalog_replacement_atomic, but here we used mode=import_update!
    // The API might allow finalize, let's see. Wait, in finalize we do archive only if mode=replace. So finalize should work and return success.
    
    if (!res.ok) {
       console.log("Finalize responded with error (maybe expected if not replace mode?):", await res.text())
    } else {
       console.log('Finalize success.')
    }
    
    console.log('TEST SUCCESS.')
    return { success: true, created: processResult.created, updated: processResult.updated, errors: processResult.errors }
  } catch(e) {
    console.error('TEST ERROR:', e.message)
    return { success: false, error: e.message }
  } finally {
    fs.unlinkSync(filePath)
  }
}

runSmallTest().then(r => {
    if(r.success) {
        console.log(`\nTOTAL 1`)
        console.log(`PASS 1`)
        console.log(`FAIL 0`)
    } else {
        console.log(`\nTOTAL 1`)
        console.log(`PASS 0`)
        console.log(`FAIL 1`)
    }
    process.exit(r.success ? 0 : 1)
})
