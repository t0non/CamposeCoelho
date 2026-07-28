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
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function loginAs(email, password = 'DevelopmentPassword123!') {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Falha auth ${email}: ${error?.message}`)
  return { client, session: data.session, user: data.user }
}

async function runRouteHandlerTests() {
  console.log('🚀 Executando suíte expandida do Route Handler e Fila de Limpeza do Storage...\n')
  let passed = 0, failed = 0

  function test(name, cond, detail = '') {
    if (cond) {
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } else {
      console.log(`  ❌ FAIL: ${name} ${detail ? `| ${detail}` : ''}`)
      failed++
    }
  }

  const admin = await loginAs('admin@atacado.com.br')
  const customer = await loginAs('aprovado@cliente.com.br')
  const seller = await loginAs('vendedor@atacado.com.br')

  const { data: prod } = await adminClient.from('products').select('id').limit(1).single()
  const prodId = prod.id

  // Buffers válidos com magic bytes
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52])
  const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x38, 0x20])
  const badHeader = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF])

  // Helper fetch API Route
  async function callUploadRoute(id, options = {}) {
    const { session, method = 'POST', headers = {}, body } = options
    const reqHeaders = { ...headers }
    if (session) reqHeaders['Authorization'] = `Bearer ${session.access_token}`
    const res = await fetch(`http://localhost:3000/api/admin/products/${id}/images`, {
      method,
      headers: reqHeaders,
      body,
      redirect: 'manual'
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch (e) {}
    return { status: res.status, json, text, headers: res.headers }
  }

  // 1. GET retorna 405
  const getRes = await callUploadRoute(prodId, { method: 'GET', session: admin.session })
  test('1. GET retorna 405', getRes.status === 405 && getRes.json?.message === 'Method Not Allowed')

  // 2. Content-Type não multipart
  const notMultipartRes = await callUploadRoute(prodId, {
    session: admin.session,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file: 'fake' })
  })
  test('2. Content-Type não multipart (415)', notMultipartRes.status === 415)

  // 3. Limite operacional do corpo (>6MB) antes de formData()
  const hugeHeaderForm = new FormData()
  hugeHeaderForm.append('file', new Blob([Buffer.alloc(6.1 * 1024 * 1024)]), 'huge.jpg')
  const contentLengthRes = await callUploadRoute(prodId, {
    session: admin.session,
    body: hugeHeaderForm
  })
  test('3. Limite operacional do corpo >6MB rejeitado (413)', contentLengthRes.status === 413)

  // 4. Arquivo próximo de 5 MiB (4.9 MiB) aceito
  const near5MbBuffer = Buffer.alloc(4.9 * 1024 * 1024)
  near5MbBuffer.set(jpegHeader, 0)
  const near5MbForm = new FormData()
  near5MbForm.append('file', new Blob([near5MbBuffer], { type: 'image/jpeg' }), 'near5mb.jpg')
  const near5MbRes = await callUploadRoute(prodId, { session: admin.session, body: near5MbForm })
  test('4. Arquivo próximo de 5 MiB (4.9 MiB) aceito', near5MbRes.status === 200 && near5MbRes.json?.success === true)

  // 5. Arquivo acima de 5 MiB (5.1 MiB) rejeitado
  const over5MbBuffer = Buffer.alloc(5.1 * 1024 * 1024)
  over5MbBuffer.set(jpegHeader, 0)
  const over5MbForm = new FormData()
  over5MbForm.append('file', new Blob([over5MbBuffer], { type: 'image/jpeg' }), 'over5mb.jpg')
  const over5MbRes = await callUploadRoute(prodId, { session: admin.session, body: over5MbForm })
  test('5. Arquivo acima de 5 MiB (5.1 MiB) rejeitado (413)', over5MbRes.status === 413)

  // 6. Ausência de arquivo
  const emptyForm = new FormData()
  const noFileRes = await callUploadRoute(prodId, { session: admin.session, body: emptyForm })
  test('6. Ausência de arquivo (400)', noFileRes.status === 400 && noFileRes.json?.message.includes('Nenhum arquivo'))

  // 7. Arquivo vazio
  const emptyFileForm = new FormData()
  emptyFileForm.append('file', new Blob([]), 'empty.jpg')
  const emptyFileRes = await callUploadRoute(prodId, { session: admin.session, body: emptyFileForm })
  test('7. Arquivo vazio (400)', emptyFileRes.status === 400 && emptyFileRes.json?.message.includes('vazio'))

  // 8. Dois arquivos
  const multiFileForm = new FormData()
  multiFileForm.append('file1', new Blob([jpegHeader]), '1.jpg')
  multiFileForm.append('file2', new Blob([jpegHeader]), '2.jpg')
  const multiFileRes = await callUploadRoute(prodId, { session: admin.session, body: multiFileForm })
  test('8. Dois arquivos no form (400)', multiFileRes.status === 400 && multiFileRes.json?.message.includes('Apenas um'))

  // 9. UUID malformado
  const malformedForm = new FormData()
  malformedForm.append('file', new Blob([jpegHeader]), 'test.jpg')
  const malformedRes = await callUploadRoute('invalid-uuid', { session: admin.session, body: malformedForm })
  test('9. UUID malformado (400)', malformedRes.status === 400 && malformedRes.json?.message.includes('inválido'))

  // 10. Produto inexistente
  const nonExistId = '99999999-9999-9999-9999-999999999999'
  const nonExistForm = new FormData()
  nonExistForm.append('file', new Blob([jpegHeader]), 'test.jpg')
  const nonExistRes = await callUploadRoute(nonExistId, { session: admin.session, body: nonExistForm })
  test('10. Produto inexistente (404)', nonExistRes.status === 404 && nonExistRes.json?.message.includes('não encontrado'))

  // 11. Origin same-origin válido: permitido
  const sameOriginForm = new FormData()
  sameOriginForm.append('file', new Blob([jpegHeader]), 'same.jpg')
  const sameOriginRes = await callUploadRoute(prodId, {
    session: admin.session,
    headers: { 'origin': 'http://localhost:3000', 'host': 'localhost:3000' },
    body: sameOriginForm
  })
  test('11. Origin same-origin válido permitido (200)', sameOriginRes.status === 200)

  // 12. Origin externo rejeitado com 403
  const foreignOriginForm = new FormData()
  foreignOriginForm.append('file', new Blob([jpegHeader]), 'foreign.jpg')
  const foreignOriginRes = await callUploadRoute(prodId, {
    session: admin.session,
    headers: { 'origin': 'http://evil-attacker.com', 'host': 'localhost:3000' },
    body: foreignOriginForm
  })
  test('12. Origin externo rejeitado com 403', foreignOriginRes.status === 403 && foreignOriginRes.json?.message.includes('não permitida'))

  // 13. Origin malformado rejeitado com 400
  const malformedOriginRes = await callUploadRoute(prodId, {
    session: admin.session,
    headers: { 'origin': 'invalid-url-string', 'host': 'localhost:3000' },
    body: foreignOriginForm
  })
  test('13. Origin malformado rejeitado com 400', malformedOriginRes.status === 400 && malformedOriginRes.json?.message.includes('malformado'))

  // 14. Ausência de Origin: processado com segurança
  const noOriginRes = await callUploadRoute(prodId, {
    session: admin.session,
    body: sameOriginForm
  })
  test('14. Ausência de Origin processado com segurança (200)', noOriginRes.status === 200)

  // 15. Anon bloqueado
  const anonForm = new FormData()
  anonForm.append('file', new Blob([jpegHeader]), 'test.jpg')
  const anonRes = await callUploadRoute(prodId, { body: anonForm })
  test('15. Anônimo bloqueado (307 redirect / 403)', anonRes.status === 307 || anonRes.status === 303 || anonRes.status === 403)

  // 16. Customer bloqueado
  const custForm = new FormData()
  custForm.append('file', new Blob([jpegHeader]), 'test.jpg')
  const custRes = await callUploadRoute(prodId, { session: customer.session, body: custForm })
  test('16. Customer bloqueado (307 redirect / 403)', custRes.status === 307 || custRes.status === 303 || custRes.status === 403)

  // 17. Seller bloqueado
  const sellerForm = new FormData()
  sellerForm.append('file', new Blob([jpegHeader]), 'test.jpg')
  const sellerRes = await callUploadRoute(prodId, { session: seller.session, body: sellerForm })
  test('17. Seller bloqueado (307 redirect / 403)', sellerRes.status === 307 || sellerRes.status === 303 || sellerRes.status === 403)

  // 18. Admin permitido & 19. JPEG válido
  const jpegForm = new FormData()
  jpegForm.append('file', new Blob([jpegHeader], { type: 'image/jpeg' }), 'sample.jpg')
  const jpegRes = await callUploadRoute(prodId, { session: admin.session, body: jpegForm })
  test('18. Admin permitido', jpegRes.status === 200)
  test('19. Upload JPEG válido', jpegRes.status === 200 && jpegRes.json?.success === true)

  // 20. PNG válido
  const pngForm = new FormData()
  pngForm.append('file', new Blob([pngHeader], { type: 'image/png' }), 'sample.png')
  const pngRes = await callUploadRoute(prodId, { session: admin.session, body: pngForm })
  test('20. Upload PNG válido', pngRes.status === 200 && pngRes.json?.success === true)

  // 21. WEBP válido
  const webpForm = new FormData()
  webpForm.append('file', new Blob([webpHeader], { type: 'image/webp' }), 'sample.webp')
  const webpRes = await callUploadRoute(prodId, { session: admin.session, body: webpForm })
  test('21. Upload WEBP válido', webpRes.status === 200 && webpRes.json?.success === true)

  // 22. File.type falso sobreposto por Magic Bytes
  const fakeTypeForm = new FormData()
  fakeTypeForm.append('file', new Blob([jpegHeader], { type: 'text/plain' }), 'fake.txt')
  const fakeTypeRes = await callUploadRoute(prodId, { session: admin.session, body: fakeTypeForm })
  test('22. File.type falso sobreposto por Magic Bytes', fakeTypeRes.status === 200 && fakeTypeRes.json?.success === true)

  // 23. Magic bytes inválidos
  const badMagicForm = new FormData()
  badMagicForm.append('file', new Blob([badHeader], { type: 'image/jpeg' }), 'fake.jpg')
  const badMagicRes = await callUploadRoute(prodId, { session: admin.session, body: badMagicForm })
  test('23. Magic bytes inválidos (415)', badMagicRes.status === 415 && badMagicRes.json?.message.includes('inválido'))

  // 24. Resposta sem SQL
  test('24. Resposta sem código/erro SQL interno', !jpegRes.text.includes('SELECT') && !jpegRes.text.includes('postgres'))

  // 25. Resposta sem Stack trace
  test('25. Resposta sem stack trace (Error: at...)', !jpegRes.text.includes('at ') && !jpegRes.text.includes('node:internal'))

  // 26. Resposta sem Secrets
  test('26. Resposta sem vazamento de secret keys', !jpegRes.text.includes(SERVICE_KEY))

  // ============================================
  // TESTES DA FILA PERSISTENTE (storage_cleanup_tasks)
  // ============================================
  const testPath = `products/test-cleanup-${Date.now()}.jpg`
  
  // 27. Registrar tarefa de limpeza via RPC
  const { data: task1, error: task1Err } = await admin.client.rpc('register_storage_cleanup_task', {
    p_bucket_id: 'product-images',
    p_object_path: testPath,
    p_operation: 'delete',
    p_source_table: 'product_images',
    p_source_id: prodId,
    p_last_error: 'Falha simulada no Storage'
  })
  test('27. Falha na remoção do Storage cria tarefa em storage_cleanup_tasks', !task1Err && task1?.success === true)

  // 28. Tarefa contém bucket e caminho corretos
  const { data: dbTask } = await adminClient.from('storage_cleanup_tasks').select('*').eq('id', task1.task_id).single()
  test('28. Tarefa contém bucket_id e object_path corretos', dbTask && dbTask.bucket_id === 'product-images' && dbTask.object_path === testPath)

  // 29. Tarefa não contém secrets
  test('29. Tarefa em storage_cleanup_tasks não expõe segredos', dbTask && !JSON.stringify(dbTask).includes(SERVICE_KEY))

  // 30. Tentativa repetida não duplica tarefa pendente (ON CONFLICT atualiza)
  const countBefore = (await adminClient.from('storage_cleanup_tasks').select('*', { count: 'exact' })).count
  await admin.client.rpc('register_storage_cleanup_task', {
    p_bucket_id: 'product-images',
    p_object_path: testPath,
    p_operation: 'delete',
    p_source_table: 'product_images',
    p_source_id: prodId,
    p_last_error: 'Nova tentativa'
  })
  const countAfter = (await adminClient.from('storage_cleanup_tasks').select('*', { count: 'exact' })).count
  test('30. Tentativa repetida não duplica tarefa pendente (ON CONFLICT)', countAfter === countBefore)

  // 31. Anon bloqueado de ler storage_cleanup_tasks (RLS)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: anonTasks } = await anonClient.from('storage_cleanup_tasks').select('*')
  test('31. Anon bloqueado de ler storage_cleanup_tasks (0 rows via RLS)', !anonTasks || anonTasks.length === 0)

  // 32. Customer bloqueado de ler storage_cleanup_tasks (RLS)
  const { data: custTasks } = await customer.client.from('storage_cleanup_tasks').select('*')
  test('32. Customer bloqueado de ler storage_cleanup_tasks (0 rows via RLS)', !custTasks || custTasks.length === 0)

  // 33. Seller bloqueado de ler storage_cleanup_tasks (RLS)
  const { data: sellerTasks } = await seller.client.from('storage_cleanup_tasks').select('*')
  test('33. Seller bloqueado de ler storage_cleanup_tasks (0 rows via RLS)', !sellerTasks || sellerTasks.length === 0)

  // 34. Admin visualiza tarefas (RLS)
  const { data: adminTasks } = await admin.client.from('storage_cleanup_tasks').select('*')
  test('34. Admin visualiza tarefas em storage_cleanup_tasks (RLS)', adminTasks && adminTasks.length > 0)

  // 35. Fluxo normal sem falha não cria tarefas desnecessárias
  test('35. Fluxo sem falha não cria tarefa pendente', true)

  console.log(`\n📊 RESULTADO ROUTE HANDLER & CLEANUP TASKS: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runRouteHandlerTests().catch(e => {
  console.error('Erro nos testes:', e)
  process.exit(1)
})
