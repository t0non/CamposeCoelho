import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as xlsx from 'xlsx'
import crypto from 'crypto'

type ExcelCell = string | number | boolean | null | undefined
type ExcelRow = ExcelCell[]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'O arquivo excede o limite de 10 MB.' }, { status: 400 })
    }
    
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Formato de arquivo inválido. Apenas .xlsx é permitido.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    const workbook = xlsx.read(buffer, { type: 'buffer' })
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'A planilha está vazia.' }, { status: 400 })
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData = xlsx.utils.sheet_to_json<ExcelRow>(firstSheet, { header: 1, defval: '' })

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'A planilha não contém dados.' }, { status: 400 })
    }

    if (rawData.length > 20000) {
      return NextResponse.json({ error: 'A planilha excede o limite de 20.000 linhas.' }, { status: 400 })
    }

    // Identificar a linha de cabeçalho
    let headerRowIndex = -1
    const expectedHeaders = ['descrição', 'descricao', 'código', 'codigo', 'cod. barras', 'cod barras', 'unidade', 'preço', 'preco', 'preço venda', 'preco venda', 'valor', 'inativo']
    
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (!Array.isArray(row)) continue
      
      const normalizedRow = row.map(cell => String(cell).toLowerCase().trim())
      const matchCount = normalizedRow.filter(cell => expectedHeaders.includes(cell)).length
      
      // Se encontrou pelo menos 3 colunas esperadas, assume que é o cabeçalho
      if (matchCount >= 3) {
        headerRowIndex = i
        break
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: 'Não foi possível encontrar a linha de cabeçalho com colunas válidas.' }, { status: 400 })
    }

    const headers = rawData[headerRowIndex].map(h => String(h).toLowerCase().trim())
    
    const colCode = headers.findIndex(h => h === 'código' || h === 'codigo')
    const colDesc = headers.findIndex(h => h === 'descrição' || h === 'descricao')
    const colBarcode = headers.findIndex(h => h === 'cod. barras' || h === 'cod barras' || h === 'cód. barras')
    const colUnit = headers.findIndex(h => h === 'unidade')
    const colPrice = headers.findIndex(h => h.includes('preço') || h.includes('preco') || h.includes('valor'))
    const colInactive = headers.findIndex(h => h === 'inativo')

    if (colCode === -1 || colDesc === -1) {
      return NextResponse.json({ error: 'As colunas obrigatórias "Código" e "Descrição" não foram encontradas.' }, { status: 400 })
    }

    // Criar a sessão
    const { data: session, error: sessionError } = await supabase
      .from('catalog_import_sessions')
      .insert({
        admin_id: user.id,
        file_name: file.name,
        file_hash: fileHash,
        status: 'preview',
      })
      .select()
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Erro ao criar sessão de importação.' }, { status: 500 })
    }

    const rowsToInsert = []
    let validCount = 0
    let warningCount = 0
    let errorCount = 0

    const rawDataFormatted = xlsx.utils.sheet_to_json<ExcelRow>(firstSheet, { header: 1, defval: '', raw: false })

    for (let i = headerRowIndex + 1; i < rawDataFormatted.length; i++) {
      const row = rawDataFormatted[i]
      if (!Array.isArray(row) || row.length === 0 || row.every(c => !String(c).trim())) continue

      let rawCode = String(row[colCode] || '').trim()
      const rawDesc = String(row[colDesc] || '').trim()
      const rawBarcode = colBarcode !== -1 ? String(row[colBarcode] || '').trim() : null
      const rawUnit = colUnit !== -1 ? String(row[colUnit] || '').trim() : 'UN'
      const rawPrice = colPrice !== -1 ? String(row[colPrice] || '').trim() : null
      const rawInactive = colInactive !== -1 ? String(row[colInactive] || '').trim().toLowerCase() : 'não'

      const warnings: {type: string, message: string}[] = []
      const errors: {type: string, message: string}[] = []
      let status = 'valid'

      if (!rawCode) {
        errors.push({ type: 'missing_code', message: 'Código vazio' })
      }
      if (!rawDesc) {
        errors.push({ type: 'missing_desc', message: 'Descrição vazia' })
      }

      // Check format
      const originalValue = rawData[i][colCode]
      if (typeof originalValue === 'number') {
        warnings.push({ type: 'number_format', message: 'O código foi armazenado como número na planilha e pode ter perdido zeros à esquerda.' })
      }

      // Preço
      let salePrice = null
      if (rawPrice) {
        const cleanPrice = rawPrice.replace(/[R$\s]/gi, '').replace(/\./g, '').replace(',', '.')
        salePrice = parseFloat(cleanPrice)
        if (isNaN(salePrice)) {
          errors.push({ type: 'invalid_price', message: 'Preço inválido' })
        } else if (salePrice === 0) {
          warnings.push({ type: 'zero_price', message: 'Preço zero (não será comercializável)' })
        }
      }

      const isInactive = ['sim', 'true', '1', 'inativo'].includes(rawInactive)

      if (errors.length > 0) {
        status = 'error'
        errorCount++
      } else if (warnings.length > 0) {
        status = 'warning'
        warningCount++
      } else {
        validCount++
      }

      rowsToInsert.push({
        session_id: session.id,
        raw_row_number: i + 1,
        sku: rawCode,
        name: rawDesc,
        barcode: rawBarcode,
        unit: rawUnit || 'UN',
        sale_price: salePrice,
        is_inactive: isInactive,
        validation_status: status,
        warnings,
        errors,
      })
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto válido encontrado após o cabeçalho.' }, { status: 400 })
    }

    // Validar SKUs duplicados no payload
    const skuMap = new Map()
    for (const row of rowsToInsert) {
      if (row.validation_status === 'error') continue
      if (skuMap.has(row.sku)) {
        row.validation_status = 'error'
        row.errors.push({ type: 'duplicate_sku', message: 'Código duplicado na própria planilha' })
        errorCount++
        if (row.validation_status === 'valid') validCount-- 
      } else {
        skuMap.set(row.sku, true)
      }
    }

    // Inserir linhas em lotes
    const CHUNK_SIZE = 500
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE)
      await supabase.from('catalog_import_session_rows').insert(chunk)
    }

    const batchSize = 100
    const totalBatches = Math.ceil(rowsToInsert.length / batchSize)
    const batches = []
    
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * batchSize
      const endIdx = Math.min((i + 1) * batchSize - 1, rowsToInsert.length - 1)
      batches.push({
        session_id: session.id,
        batch_number: i + 1,
        status: 'pending',
        rows_start: rowsToInsert[startIdx].raw_row_number,
        rows_end: rowsToInsert[endIdx].raw_row_number,
      })
    }

    if (batches.length > 0) {
      await supabase.from('catalog_import_session_batches').insert(batches)
    }

    await supabase.from('catalog_import_sessions')
      .update({ total_rows: rowsToInsert.length, total_batches: totalBatches })
      .eq('id', session.id)

    return NextResponse.json({
      success: true,
      session_id: session.id,
      stats: {
        total: rowsToInsert.length,
        valid: validCount,
        warnings: warningCount,
        errors: errorCount,
        total_batches: totalBatches
      }
    })

  } catch (error: unknown) {
    console.error('Parse API Error:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
