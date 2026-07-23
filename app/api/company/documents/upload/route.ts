import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/supabase/auth'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'company-documents'

export async function POST(request: NextRequest) {
  let ctx = await getAuthContext()

  // Se não encontrou usuário por cookies (ex: chamada de teste via fetch API), checar Authorization Header Bearer token
  if (!ctx.user) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const tokenClient = createSupabaseClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      })
      const { data: { user } } = await tokenClient.auth.getUser()
      if (user) {
        const { data: profile } = await tokenClient.from('profiles').select('*').eq('id', user.id).single()
        ctx = {
          user: {
            id: user.id,
            email: user.email!,
            role: (profile?.role as any) || 'customer',
            company_id: profile?.company_id || null,
            full_name: profile?.full_name || '',
            phone: profile?.phone || null,
            avatar_url: profile?.avatar_url || null,
            created_at: profile?.created_at || new Date().toISOString(),
            updated_at: profile?.updated_at || new Date().toISOString(),
          },
          company: null,
          canViewPrices: false,
          canOrder: false,
        }
      }
    }
  }

  if (!ctx.user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  if (!ctx.user.company_id) {
    return NextResponse.json(
      { error: 'Empresa não encontrada. Complete o cadastro empresarial primeiro.' },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Falha ao processar requisição de upload. Tamanho máximo permitido: 10 MB.' },
      { status: 400 },
    )
  }

  const file = formData.get('file') as File | null
  const documentType = formData.get('document_type') as string | null

  if (!file || !documentType) {
    return NextResponse.json({ error: 'Arquivo e tipo de documento são obrigatórios.' }, { status: 400 })
  }

  // Validar MIME type (servidor — não confiar apenas na extensão)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Formato inválido. Tipos permitidos: PDF, JPEG, PNG. Recebido: ${file.type}` },
      { status: 400 },
    )
  }

  // Validar tamanho
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo excede o limite de 10 MB. Tamanho recebido: ${(file.size / 1024 / 1024).toFixed(2)} MB.` },
      { status: 400 },
    )
  }

  // Gerar caminho seguro: company_id/document_type/timestamp_uuid.ext
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const uniqueId = crypto.randomUUID()
  const filePath = `${ctx.user.company_id}/${documentType}/${Date.now()}_${uniqueId}.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Upload para o Storage privado
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Falha no upload: ${uploadError.message}` },
      { status: 500 },
    )
  }

  // Registrar metadados no banco de dados
  const { data: docRecord, error: dbError } = await supabase
    .from('company_documents')
    .insert({
      company_id: ctx.user.company_id,
      document_type: documentType,
      file_path: filePath,
      file_name: file.name,
      status: 'pending',
    })
    .select('id')
    .single()

  if (dbError) {
    // Rollback do arquivo no storage em caso de falha no banco
    await supabase.storage.from(BUCKET).remove([filePath])
    return NextResponse.json(
      { error: `Erro ao salvar metadados do documento: ${dbError.message}` },
      { status: 500 },
    )
  }

  // Registrar audit log
  await supabase.from('audit_logs').insert({
    actor_id: ctx.user.id,
    action: 'document_uploaded',
    target_table: 'company_documents',
    target_id: docRecord.id,
    payload: { document_type: documentType, file_name: file.name, company_id: ctx.user.company_id },
  })

  return NextResponse.json({
    success: true,
    documentId: docRecord.id,
    filePath,
    message: 'Documento enviado com sucesso para análise.',
  })
}
