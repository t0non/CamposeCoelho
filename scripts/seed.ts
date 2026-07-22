import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// 1. Carregar .env.local de forma autoritativa
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('💥 [ERRO EXPLÍCITO] Arquivo .env.local não foi encontrado.')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      process.env[key] = val
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !secretKey) {
  console.error('💥 [ERRO EXPLÍCITO] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY ausente no .env.local.')
  process.exit(1)
}

let hostname = ''
try {
  hostname = new URL(supabaseUrl).hostname
} catch {
  console.error('💥 [ERRO EXPLÍCITO] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.')
  process.exit(1)
}

console.log(`🔍 [VALIDAÇÃO DE HOSTNAME] Supabase Target Host: ${hostname}`)

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEFAULT_PASSWORD = 'DevelopmentPassword123!'

interface UserSeedData {
  email: string
  fullName: string
  role: 'admin' | 'seller' | 'customer'
  company?: {
    cnpj: string
    name: string
    tradeName: string
    status: 'pending' | 'approved' | 'rejected' | 'suspended'
    sellerEmail?: string
  }
}

const seedUsers: UserSeedData[] = [
  {
    email: 'admin@atacado.com.br',
    fullName: 'Administrador Geral',
    role: 'admin',
  },
  {
    email: 'vendedor@atacado.com.br',
    fullName: 'Carlos Eduardo (Vendedor)',
    role: 'seller',
  },
  {
    email: 'aprovado@cliente.com.br',
    fullName: 'João Silva (Cliente Aprovado)',
    role: 'customer',
    company: {
      cnpj: '12345678000190',
      name: 'Silva & Filhos Distribuidora LTDA',
      tradeName: 'Silva Atacado',
      status: 'approved',
      sellerEmail: 'vendedor@atacado.com.br',
    },
  },
  {
    email: 'pendente@cliente.com.br',
    fullName: 'Maria Oliveira (Cliente Pendente)',
    role: 'customer',
    company: {
      cnpj: '98765432000110',
      name: 'Oliveira Alimentos EIRELI',
      tradeName: 'Oliveira Alimentos',
      status: 'pending',
    },
  },
  {
    email: 'recusado@cliente.com.br',
    fullName: 'Pedro Souza (Cliente Recusado)',
    role: 'customer',
    company: {
      cnpj: '55444333000122',
      name: 'Souza Varejo ME',
      tradeName: 'Souza Varejo',
      status: 'rejected',
    },
  },
]

async function runSeed() {
  console.log('🚀 Executando seed de dados de controle no Supabase remoto...')

  // 1. Categoria de controle
  console.log('📁 Criando Categoria de controle...')
  const { data: categoryData, error: catErr } = await supabaseAdmin
    .from('categories')
    .upsert(
      {
        name: 'Categoria de Teste RLS',
        slug: 'categoria-teste',
        description: 'Categoria para testes automatizados de controle',
        is_active: true,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()

  if (catErr) throw new Error(`Erro ao criar categoria: ${catErr.message}`)

  // 2. Marca de controle
  console.log('🏷️ Criando Marca de controle...')
  const { data: brandData, error: brandErr } = await supabaseAdmin
    .from('brands')
    .upsert(
      {
        name: 'Marca de Teste RLS',
        slug: 'marca-teste',
        is_active: true,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()

  if (brandErr) throw new Error(`Erro ao criar marca: ${brandErr.message}`)

  // 3. Produto de controle
  console.log('📦 Criando Produto de controle público...')
  const { data: productData, error: prodErr } = await supabaseAdmin
    .from('products')
    .upsert(
      {
        sku: 'PROD-TESTE-001',
        name: 'Produto Controle RLS',
        slug: 'produto-controle-rls',
        description: 'Produto público para testes automatizados de RLS',
        category_id: categoryData.id,
        brand_id: brandData.id,
        unit: 'UN',
        min_quantity: 1,
        multiple_quantity: 1,
        is_active: true,
      },
      { onConflict: 'sku' },
    )
    .select('id')
    .single()

  if (prodErr) throw new Error(`Erro ao criar produto: ${prodErr.message}`)

  // 4. Imagem do produto de controle
  console.log('🖼️ Criando Imagem do produto...')
  const { data: existingImg } = await supabaseAdmin
    .from('product_images')
    .select('id')
    .eq('product_id', productData.id)
    .maybeSingle()

  if (!existingImg) {
    await supabaseAdmin.from('product_images').insert({
      product_id: productData.id,
      url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
      alt_text: 'Imagem Produto Controle',
      position: 0,
      is_primary: true,
    })
  }

  // 5. Variante do produto de controle
  console.log('🔄 Criando Variante do produto...')
  const { data: variantData, error: varErr } = await supabaseAdmin
    .from('product_variants')
    .upsert(
      {
        product_id: productData.id,
        sku: 'VAR-TESTE-001',
        name: 'Variante Controle RLS',
        attributes: { cor: 'Padrao' },
      },
      { onConflict: 'sku' },
    )
    .select('id')
    .single()

  if (varErr) throw new Error(`Erro ao criar variante: ${varErr.message}`)

  // 6. Inventário do produto
  console.log('📊 Criando Inventário do produto...')
  const { data: existingInv } = await supabaseAdmin
    .from('inventories')
    .select('id')
    .eq('product_id', productData.id)
    .eq('variant_id', variantData.id)
    .maybeSingle()

  if (existingInv?.id) {
    await supabaseAdmin
      .from('inventories')
      .update({ quantity_available: 500 })
      .eq('id', existingInv.id)
  } else {
    await supabaseAdmin.from('inventories').insert({
      product_id: productData.id,
      variant_id: variantData.id,
      quantity_available: 500,
      quantity_reserved: 0,
      min_stock_alert: 10,
    })
  }

  // 7. Tabela de Preços Padrão
  console.log('💲 Criando Tabela de Preço de controle...')
  const { data: defaultPriceTable, error: ptFindErr } = await supabaseAdmin
    .from('price_tables')
    .select('id')
    .eq('is_default', true)
    .maybeSingle()

  if (ptFindErr) throw new Error(`Erro ao buscar tabela de preço: ${ptFindErr.message}`)

  let priceTableId = defaultPriceTable?.id

  if (!priceTableId) {
    const { data: newPt, error: ptCreateErr } = await supabaseAdmin
      .from('price_tables')
      .insert({
        name: 'Tabela Atacado Padrão',
        description: 'Tabela comercial com preços de atacado padrão',
        is_default: true,
        is_active: true,
      })
      .select('id')
      .single()

    if (ptCreateErr) throw new Error(`Erro ao criar tabela de preços: ${ptCreateErr.message}`)
    priceTableId = newPt.id
  }

  // 8. Preço do produto na Tabela (Garantir 100% de Idempotência sem duplicatas)
  console.log('🏷️ Inserindo/atualizando Preço na Tabela Atacado Padrão...')
  const { data: existingPtps } = await supabaseAdmin
    .from('price_table_products')
    .select('id')
    .eq('price_table_id', priceTableId)
    .eq('product_id', productData.id)
    .eq('variant_id', variantData.id)

  if (existingPtps && existingPtps.length > 0) {
    // Manter o primeiro id e deletar duplicatas excedentes anteriores
    const canonicalId = existingPtps[0].id
    await supabaseAdmin
      .from('price_table_products')
      .update({ unit_price: 150.0, promotional_price: 120.0 })
      .eq('id', canonicalId)

    if (existingPtps.length > 1) {
      const duplicateIds = existingPtps.slice(1).map((item) => item.id)
      await supabaseAdmin.from('price_table_products').delete().in('id', duplicateIds)
    }
  } else {
    await supabaseAdmin.from('price_table_products').insert({
      price_table_id: priceTableId,
      product_id: productData.id,
      variant_id: variantData.id,
      unit_price: 150.0,
      promotional_price: 120.0,
    })
  }

  // 9. Criar/verificar usuários no Auth e Profiles
  const userMap = new Map<string, string>()

  for (const u of seedUsers) {
    console.log(`👤 Criando/verificando usuário Auth: ${u.email}...`)

    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw new Error(`Falha ao listar usuários Auth: ${listErr.message}`)

    let userId = existingUsers?.users?.find((item) => item.email === u.email)?.id

    if (!userId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.fullName, role: u.role },
      })

      if (createError) throw new Error(`Erro ao criar usuário ${u.email}: ${createError.message}`)
      userId = newUser.user.id
    }

    userMap.set(u.email, userId)

    // Upsert Profile
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      status: 'active',
      updated_at: new Date().toISOString(),
    })

    if (profErr) throw new Error(`Erro ao criar profile para ${u.email}: ${profErr.message}`)
  }

  // 10. Criar e Relacionar Empresas
  for (const u of seedUsers) {
    if (!u.company) continue

    const userId = userMap.get(u.email)
    if (!userId) continue

    const sellerId = u.company.sellerEmail ? userMap.get(u.company.sellerEmail) : null

    console.log(`🏢 Salvando empresa para ${u.email}: ${u.company.name}...`)

    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .upsert(
        {
          cnpj: u.company.cnpj,
          company_name: u.company.name,
          trade_name: u.company.tradeName,
          status: u.company.status,
          seller_id: sellerId ?? null,
          price_table_id: priceTableId,
          email: u.email,
          approved_at: u.company.status === 'approved' ? new Date().toISOString() : null,
          rejected_at: u.company.status === 'rejected' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cnpj' },
      )
      .select('id')
      .single()

    if (companyError) throw new Error(`Erro ao salvar empresa ${u.company.name}: ${companyError.message}`)

    const companyId = companyData.id

    // Atualizar company_id no profile
    const { error: updateProfErr } = await supabaseAdmin
      .from('profiles')
      .update({ company_id: companyId })
      .eq('id', userId)

    if (updateProfErr) throw new Error(`Erro ao vincular empresa ao perfil: ${updateProfErr.message}`)

    // Inserir em company_members
    const { error: memberErr } = await supabaseAdmin.from('company_members').upsert(
      {
        company_id: companyId,
        profile_id: userId,
        role: 'owner',
        is_primary: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,profile_id' },
    )

    if (memberErr) throw new Error(`Erro ao criar membro em company_members: ${memberErr.message}`)
  }

  console.log('✅ SEED IDEMPOTENTE EXECUTADO COM SUCESSO COMPLETO NO SUPABASE REMOTO!')
}

runSeed().catch((err) => {
  console.error('💥 Falha na execução do seed remoto:', err.message)
  process.exit(1)
})
