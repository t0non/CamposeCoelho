import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB para o arquivo individual
const MAX_OPERATIONAL_BODY = 6 * 1024 * 1024 // 6 MB para o corpo total da requisição multipart

function checkMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'png'
  }
  
  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // WEBP
  ) {
    return 'webp'
  }

  return null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params
  
  // Validar UUID
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(productId)) {
    return NextResponse.json({ success: false, message: 'ID do produto inválido' }, { status: 400 })
  }

  // Validação explícita de Origin (CSRF/Cross-Origin security)
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  
  if (origin) {
    try {
      const originUrl = new URL(origin)
      const originHost = originUrl.host
      if (host && originHost !== host && !originHost.includes('localhost') && !originHost.includes('127.0.0.1')) {
        return NextResponse.json({ success: false, message: 'Origem não permitida (Cross-Origin Bloqueado).' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ success: false, message: 'Header Origin malformado.' }, { status: 400 })
    }
  }

  try {
    const { user } = await requireAdmin()
    
    // 1. ANTES DE formData(): Validação do limite operacional do corpo da requisição
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_OPERATIONAL_BODY) {
      return NextResponse.json({ success: false, message: 'Payload multipart excede o limite operacional de 6MB.' }, { status: 413 })
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ success: false, message: 'Content-Type inválido. Requer multipart/form-data.' }, { status: 415 })
    }

    const formData = await req.formData()
    
    // Precisamos validar que há exatamente UM arquivo
    let fileCount = 0
    let file: File | null = null

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File) {
        fileCount++
        file = value
      }
    }

    if (fileCount === 0) {
      return NextResponse.json({ success: false, message: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (fileCount > 1) {
      return NextResponse.json({ success: false, message: 'Apenas um arquivo é permitido por requisição.' }, { status: 400 })
    }

    // 2. DEPOIS DE formData(): Validação estrita do arquivo
    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, message: 'O arquivo enviado está vazio.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: 'O arquivo excede o limite de 5MB.' }, { status: 413 })
    }

    // Validação de magic bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const detectedType = checkMagicBytes(buffer)

    if (!detectedType) {
      return NextResponse.json({ success: false, message: 'Formato de imagem inválido ou corrompido (Assinatura não reconhecida).' }, { status: 415 })
    }

    const supabase = (await createClient()) as any

    // Confirmar se produto existe
    const { data: product } = await supabase.from('products').select('id').eq('id', productId).maybeSingle()
    if (!product) {
      return NextResponse.json({ success: false, message: 'Produto não encontrado.' }, { status: 404 })
    }

    const uuid = crypto.randomUUID()
    const ext = detectedType === 'jpeg' ? 'jpg' : detectedType // normalizar jpeg para jpg
    const relativePath = `products/${productId}/${uuid}.${ext}`

    // 1. Enviar ao Storage usando o token autenticado real (sem service_role)
    const { error: storageError } = await supabase.storage.from('product-images').upload(relativePath, buffer, {
      contentType: `image/${detectedType}`,
      upsert: false
    })

    if (storageError) {
      return NextResponse.json({ success: false, message: 'Falha ao enviar arquivo para o Storage.' }, { status: 500 })
    }

    // 2. Transação via RPC para registrar a imagem e gerar o log atômico
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_product_image', {
      p_product_id: productId,
      p_url: relativePath,
      p_alt_text: null
    })

    if (rpcError) {
      // 3. Compensação
      const { error: cleanupError } = await supabase.storage.from('product-images').remove([relativePath])
      if (cleanupError) {
        console.error(`COMPENSAÇÃO FALHOU: O arquivo ${relativePath} ficou órfão no Storage. Registrando tarefa persistente...`, cleanupError)
        // Registrar tarefa persistente de limpeza
        await supabase.rpc('register_storage_cleanup_task', {
          p_bucket_id: 'product-images',
          p_object_path: relativePath,
          p_operation: 'delete',
          p_source_table: 'product_images',
          p_source_id: productId,
          p_last_error: cleanupError?.message || rpcError?.message
        })
      }
      return NextResponse.json({ success: false, message: 'Falha ao registrar a imagem no banco de dados. A operação foi cancelada.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: rpcResult 
    })

  } catch (err: any) {
    if (err.digest?.startsWith('NEXT_REDIRECT') || err.message === 'NEXT_REDIRECT') {
      throw err
    }
    if (err.message?.includes('Acesso negado')) {
      return NextResponse.json({ success: false, message: 'Acesso negado.' }, { status: 403 })
    }
    return NextResponse.json({ success: false, message: 'Erro interno no processamento do upload.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 })
}
