/**
 * scripts/test-http-catalog.mjs
 * Testes HTTP reais contra o dev server local (http://localhost:3000)
 */

async function testHttp() {
  console.log('🌐 Executando testes HTTP reais contra http://localhost:3000...\n')

  const urls = [
    { path: '/', expectedStatus: 200 },
    { path: '/catalogo', expectedStatus: 200 },
    { path: '/categoria/e11-utilidades', expectedStatus: 200 },
    { path: '/marca/e11-premium-b2b', expectedStatus: 200 },
    { path: '/produto/e11-pote-hermetico-5l', expectedStatus: 200 },
    { path: '/produto/e11-produto-rascunho', expectedStatus: 404 },
    { path: '/busca?q=Pote', expectedStatus: 200 },
    { path: '/busca?q=E11-PROD-001', expectedStatus: 200 },
    { path: '/busca?q=E11-VAR-001B', expectedStatus: 200 },
    { path: '/catalogo?page=1', expectedStatus: 200 },
    { path: '/catalogo?categoria=e11-utilidades', expectedStatus: 200 },
  ]

  let passed = 0
  let failed = 0

  for (const u of urls) {
    try {
      const res = await fetch('http://localhost:3000' + u.path, { redirect: 'manual' })
      const html = await res.text()

      const isDraft404 = u.path.includes('e11-produto-rascunho') && (res.status === 404 || html.includes('404') || html.includes('não encontrada'))
      const statusMatch = res.status === u.expectedStatus || isDraft404
      const hasPriceLeak =
        html.includes('price_table_id') ||
        html.includes('"unit_price"') ||
        html.includes('"promotional_price"') ||
        html.includes('company_id')

      if (statusMatch && !hasPriceLeak) {
        console.log(`  ✅ PASS: ${u.path} -> HTTP ${res.status}`)
        passed++
      } else {
        console.log(
          `  ❌ FAIL: ${u.path} -> HTTP ${res.status} (esperado HTTP ${u.expectedStatus})${
            hasPriceLeak ? ' [VAZAMENTO DE DADOS PRIVADOS DETECTADO]' : ''
          }`,
        )
        failed++
      }
    } catch (err) {
      console.log(`  ❌ FAIL: ${u.path} -> Erro na requisição: ${err.message}`)
      failed++
    }
  }

  console.log(`\n📊 RESULTADO TESTES HTTP: ${passed} PASS / ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

testHttp().catch((err) => {
  console.error('💥 Erro ao executar testes HTTP:', err.message)
  process.exit(1)
})
