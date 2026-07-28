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

  // ============================================================
  // ETAPA 11 — Dados de Catálogo B2B (determinísticos, idempotentes)
  // Slugs/SKUs prefixados com E11- para não colidir com dados anteriores.
  // Executar duas vezes mantém as mesmas contagens.
  // ============================================================
  console.log('\n🛒 [Etapa 11] Criando dados de catálogo B2B...')

  // ── E11.1: Tabela de Preços B (diferente da padrão)
  console.log('💲 [E11] Tabela de Preços B...')
  const { data: existingTableB } = await supabaseAdmin
    .from('price_tables')
    .select('id')
    .eq('name', 'E11 Tabela Atacado B')
    .maybeSingle()

  let priceTableBId: string
  if (existingTableB?.id) {
    priceTableBId = existingTableB.id
  } else {
    const { data: newTableB, error: tableBErr } = await supabaseAdmin
      .from('price_tables')
      .insert({
        name: 'E11 Tabela Atacado B',
        description: 'Tabela B exclusiva para testes da Etapa 11 — preços diferenciados',
        is_default: false,
        is_active: true,
      })
      .select('id')
      .single()
    if (tableBErr) throw new Error(`[E11] Erro ao criar Tabela B: ${tableBErr.message}`)
    priceTableBId = newTableB.id
  }

  // ── E11.2: Usuário aprovado B (vinculado à Tabela B)
  console.log('👤 [E11] Customer aprovado B (Tabela B)...')
  const { data: allUsersE11, error: listErrE11 } = await supabaseAdmin.auth.admin.listUsers()
  if (listErrE11) throw new Error(`[E11] Erro ao listar usuários: ${listErrE11.message}`)

  const customerBEmail = 'aprovado2@cliente.com.br'
  let customerBId = allUsersE11?.users?.find((u) => u.email === customerBEmail)?.id

  if (!customerBId) {
    const { data: newB, error: errB } = await supabaseAdmin.auth.admin.createUser({
      email: customerBEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Ana Lima (Cliente Aprovado B)', role: 'customer' },
    })
    if (errB) throw new Error(`[E11] Erro ao criar customer B: ${errB.message}`)
    customerBId = newB.user.id
  }

  const { error: profBErr } = await supabaseAdmin.from('profiles').upsert({
    id: customerBId,
    full_name: 'Ana Lima (Cliente Aprovado B)',
    email: customerBEmail,
    role: 'customer',
    status: 'active',
    updated_at: new Date().toISOString(),
  })
  if (profBErr) throw new Error(`[E11] Erro ao criar profile B: ${profBErr.message}`)

  // ── E11.3: Empresa B vinculada à Tabela B
  console.log('🏢 [E11] Empresa B...')
  const { data: companyBData, error: companyBErr } = await supabaseAdmin
    .from('companies')
    .upsert(
      {
        cnpj: '22333444000155',
        company_name: 'Lima Distribuidora B LTDA',
        trade_name: 'Lima Atacado B',
        status: 'approved',
        price_table_id: priceTableBId,
        email: customerBEmail,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cnpj' },
    )
    .select('id')
    .single()

  if (companyBErr) throw new Error(`[E11] Erro ao criar Empresa B: ${companyBErr.message}`)
  const companyBId = companyBData.id

  await supabaseAdmin.from('profiles').update({ company_id: companyBId }).eq('id', customerBId)

  await supabaseAdmin.from('company_members').upsert(
    {
      company_id: companyBId,
      profile_id: customerBId,
      role: 'owner',
      is_primary: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,profile_id' },
  )

  // ── E11.4: Categorias de catálogo da Etapa 11
  console.log('📁 [E11] Categorias E11...')
  const { data: catUtilData, error: catUtilErr } = await supabaseAdmin
    .from('categories')
    .upsert(
      {
        name: 'E11 Utilidades Domésticas',
        slug: 'e11-utilidades',
        description: 'Utilidades para o lar — Etapa 11',
        is_active: true,
        seo_title: 'Utilidades Domésticas no Atacado',
        seo_description: 'Compre utilidades domésticas no atacado B2B.',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (catUtilErr) throw new Error(`[E11] Erro ao criar categoria Utilidades: ${catUtilErr.message}`)

  const { data: catFerrData, error: catFerrErr } = await supabaseAdmin
    .from('categories')
    .upsert(
      {
        name: 'E11 Ferramentas',
        slug: 'e11-ferramentas',
        description: 'Ferramentas profissionais — Etapa 11',
        is_active: true,
        seo_title: 'Ferramentas no Atacado',
        seo_description: 'Compre ferramentas no atacado B2B.',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (catFerrErr) throw new Error(`[E11] Erro ao criar categoria Ferramentas: ${catFerrErr.message}`)

  // ── E11.5: Marcas da Etapa 11
  console.log('🏷️ [E11] Marcas E11...')
  const { data: brandPremData, error: brandPremErr } = await supabaseAdmin
    .from('brands')
    .upsert(
      {
        name: 'E11 Premium B2B',
        slug: 'e11-premium-b2b',
        description: 'Marca Premium exclusiva de testes da Etapa 11',
        is_active: true,
        seo_title: 'Premium B2B — Atacado',
        seo_description: 'Produtos da marca Premium B2B no atacado.',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (brandPremErr) throw new Error(`[E11] Erro ao criar marca Premium: ${brandPremErr.message}`)

  const { data: brandFerrData, error: brandFerrErr } = await supabaseAdmin
    .from('brands')
    .upsert(
      {
        name: 'E11 FerrPro',
        slug: 'e11-ferrpro',
        description: 'Marca FerrPro exclusiva de testes da Etapa 11',
        is_active: true,
        seo_title: 'FerrPro — Ferramentas Atacado',
        seo_description: 'Ferramentas da marca FerrPro no atacado.',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (brandFerrErr) throw new Error(`[E11] Erro ao criar marca FerrPro: ${brandFerrErr.message}`)

  // ── E11.6: Produtos da Etapa 11
  // Produto 1: publicado, com preço em Tabela A e B, com promoção válida em A
  // Produto 2: publicado, com destaque, com promoção expirada em A
  // Produto 3: publicado, lançamento, sem preço em nenhuma tabela
  // Produto 4: rascunho (is_published=false) — não deve aparecer no catálogo público
  console.log('📦 [E11] Produtos E11...')

  const e11Products = [
    {
      sku: 'E11-PROD-001',
      name: 'E11 Pote Hermético 5L',
      slug: 'e11-pote-hermetico-5l',
      description: 'Pote hermético 5 litros para estoque — Etapa 11',
      short_description: 'Pote 5L hermético — atacado',
      category_id: catUtilData.id,
      brand_id: brandPremData.id,
      unit: 'UN',
      min_quantity: 12,
      multiple_quantity: 12,
      is_active: true,
      is_published: true,
      is_featured: false,
      is_new_arrival: false,
      seo_title: 'Pote Hermético 5L no Atacado',
      seo_description: 'Compre potes herméticos 5L no atacado B2B.',
    },
    {
      sku: 'E11-PROD-002',
      name: 'E11 Conjunto de Chaves',
      slug: 'e11-conjunto-chaves',
      description: 'Conjunto completo de chaves profissionais — Etapa 11',
      short_description: 'Chaves profissionais — atacado',
      category_id: catFerrData.id,
      brand_id: brandFerrData.id,
      unit: 'KIT',
      min_quantity: 6,
      multiple_quantity: 6,
      is_active: true,
      is_published: true,
      is_featured: true,
      is_new_arrival: false,
      seo_title: 'Conjunto de Chaves no Atacado',
      seo_description: 'Kits de chaves profissionais no atacado B2B.',
    },
    {
      sku: 'E11-PROD-003',
      name: 'E11 Caixa Organizadora',
      slug: 'e11-caixa-organizadora',
      description: 'Caixa organizadora empilhável — Etapa 11 (sem preço)',
      short_description: 'Caixa organizadora empilhável',
      category_id: catUtilData.id,
      brand_id: brandPremData.id,
      unit: 'UN',
      min_quantity: 24,
      multiple_quantity: 24,
      is_active: true,
      is_published: true,
      is_featured: false,
      is_new_arrival: true,
      seo_title: 'Caixa Organizadora no Atacado',
      seo_description: 'Caixas organizadoras empilháveis no atacado.',
    },
    {
      sku: 'E11-PROD-004',
      name: 'E11 Produto Rascunho',
      slug: 'e11-produto-rascunho',
      description: 'Produto em rascunho — Etapa 11 (não deve aparecer no catálogo)',
      short_description: 'Rascunho',
      category_id: catUtilData.id,
      brand_id: brandPremData.id,
      unit: 'UN',
      min_quantity: 1,
      multiple_quantity: 1,
      is_active: true,
      is_published: false, // rascunho — não visível no catálogo público
      is_featured: false,
      is_new_arrival: false,
      seo_title: null as unknown as string,
      seo_description: null as unknown as string,
    },
  ]

  const productIds: Record<string, string> = {}
  for (const p of e11Products) {
    const { data: pd, error: pe } = await supabaseAdmin
      .from('products')
      .upsert(p, { onConflict: 'sku' })
      .select('id')
      .single()
    if (pe) throw new Error(`[E11] Erro ao criar produto ${p.sku}: ${pe.message}`)
    productIds[p.sku] = pd.id
  }

  // ── E11.7: Variantes (2 por produto)
  console.log('🔄 [E11] Variantes E11...')
  const e11Variants: Array<{ sku: string; name: string; productSku: string; attrs: Record<string, string> }> = [
    // Produto 1
    { sku: 'E11-VAR-001A', name: 'Pote Hermético 5L — Transparente', productSku: 'E11-PROD-001', attrs: { cor: 'Transparente' } },
    { sku: 'E11-VAR-001B', name: 'Pote Hermético 5L — Azul',         productSku: 'E11-PROD-001', attrs: { cor: 'Azul' } },
    // Produto 2
    { sku: 'E11-VAR-002A', name: 'Conjunto Chaves — 12 peças',  productSku: 'E11-PROD-002', attrs: { tamanho: '12pcs' } },
    { sku: 'E11-VAR-002B', name: 'Conjunto Chaves — 24 peças',  productSku: 'E11-PROD-002', attrs: { tamanho: '24pcs' } },
    // Produto 3 (sem preço)
    { sku: 'E11-VAR-003A', name: 'Caixa Organizadora — P',      productSku: 'E11-PROD-003', attrs: { tamanho: 'P' } },
    { sku: 'E11-VAR-003B', name: 'Caixa Organizadora — G',      productSku: 'E11-PROD-003', attrs: { tamanho: 'G' } },
    // Produto 4 (rascunho)
    { sku: 'E11-VAR-004A', name: 'Produto Rascunho — A',        productSku: 'E11-PROD-004', attrs: { versao: 'A' } },
    { sku: 'E11-VAR-004B', name: 'Produto Rascunho — B',        productSku: 'E11-PROD-004', attrs: { versao: 'B' } },
  ]

  const variantIds: Record<string, string> = {}
  for (const v of e11Variants) {
    const { data: vd, error: ve } = await supabaseAdmin
      .from('product_variants')
      .upsert(
        {
          product_id: productIds[v.productSku],
          sku: v.sku,
          name: v.name,
          attributes: v.attrs,
          is_active: true,
          min_quantity: 1,
          multiple_quantity: 1,
        },
        { onConflict: 'sku' },
      )
      .select('id')
      .single()
    if (ve) throw new Error(`[E11] Erro ao criar variante ${v.sku}: ${ve.message}`)
    variantIds[v.sku] = vd.id
  }

  // ── E11.8: Estoque
  // E11-VAR-001A → 100 un | E11-VAR-001B → 50 un
  // E11-VAR-002A → 200 un | E11-VAR-002B → 0 un (sem estoque)
  // E11-VAR-003A → 80 un  | E11-VAR-003B → 80 un
  // E11-VAR-004A → 10 un  | E11-VAR-004B → 10 un (rascunho)
  console.log('📊 [E11] Estoque E11...')
  const e11Inventories: Array<{ sku: string; qty: number }> = [
    { sku: 'E11-VAR-001A', qty: 100 },
    { sku: 'E11-VAR-001B', qty: 50 },
    { sku: 'E11-VAR-002A', qty: 200 },
    { sku: 'E11-VAR-002B', qty: 0 },   // variante sem estoque
    { sku: 'E11-VAR-003A', qty: 80 },
    { sku: 'E11-VAR-003B', qty: 80 },
    { sku: 'E11-VAR-004A', qty: 10 },
    { sku: 'E11-VAR-004B', qty: 10 },
  ]

  for (const inv of e11Inventories) {
    const vId = variantIds[inv.sku]
    const pSku = e11Variants.find((v) => v.sku === inv.sku)!.productSku
    const pId = productIds[pSku]

    const { data: existingInvE11 } = await supabaseAdmin
      .from('inventories')
      .select('id')
      .eq('product_id', pId)
      .eq('variant_id', vId)
      .maybeSingle()

    if (existingInvE11?.id) {
      await supabaseAdmin
        .from('inventories')
        .update({ quantity_available: inv.qty })
        .eq('id', existingInvE11.id)
    } else {
      await supabaseAdmin.from('inventories').insert({
        product_id: pId,
        variant_id: vId,
        quantity_available: inv.qty,
        quantity_reserved: 0,
        min_stock_alert: 5,
      })
    }
  }

  // ── E11.9: Preços na Tabela A (padrão)
  // Produto 1/VAR-001A: R$45,00 normal | R$38,00 promo VÁLIDA (até 2099)
  // Produto 1/VAR-001B: R$42,00 normal | sem promo
  // Produto 2/VAR-002A: R$120,00 normal | R$95,00 promo EXPIRADA (terminou em 2020)
  // Produto 2/VAR-002B: R$200,00 normal | sem promo
  // Produto 3: SEM preço na Tabela A (intencional)
  console.log('💰 [E11] Preços na Tabela A...')
  const futureDate = new Date('2099-12-31T23:59:59Z').toISOString()
  const pastDate   = new Date('2020-01-01T00:00:00Z').toISOString()
  const twoYearsAgo = new Date(new Date().getFullYear() - 2, new Date().getMonth(), new Date().getDate()).toISOString()

  // Tipo explícito para permitir promotional_price nulo (campo opcional no schema)
  type PriceEntry = {
    price_table_id: string
    product_id: string
    variant_id: string
    unit_price: number
    promotional_price: number | null
    promotion_starts_at?: string
    promotion_ends_at?: string
    is_active: boolean
    min_quantity: number
  }
  const pricesTableA: PriceEntry[] = [
    {
      price_table_id: priceTableId,
      product_id: productIds['E11-PROD-001'],
      variant_id: variantIds['E11-VAR-001A'],
      unit_price: 45.00,
      promotional_price: 38.00,
      promotion_starts_at: new Date('2020-01-01').toISOString(),
      promotion_ends_at: futureDate,
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableId,
      product_id: productIds['E11-PROD-001'],
      variant_id: variantIds['E11-VAR-001B'],
      unit_price: 42.00,
      promotional_price: null as null,
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableId,
      product_id: productIds['E11-PROD-002'],
      variant_id: variantIds['E11-VAR-002A'],
      unit_price: 120.00,
      promotional_price: 95.00,
      promotion_starts_at: twoYearsAgo,
      promotion_ends_at: pastDate, // promoção expirada
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableId,
      product_id: productIds['E11-PROD-002'],
      variant_id: variantIds['E11-VAR-002B'],
      unit_price: 200.00,
      promotional_price: null as null,
      is_active: true,
      min_quantity: 1,
    },
  ]

  for (const price of pricesTableA) {
    const { data: existingPrice } = await supabaseAdmin
      .from('price_table_products')
      .select('id')
      .eq('price_table_id', price.price_table_id)
      .eq('product_id', price.product_id)
      .eq('variant_id', price.variant_id)
      .maybeSingle()

    if (existingPrice?.id) {
      await supabaseAdmin
        .from('price_table_products')
        .update({
          unit_price: price.unit_price,
          promotional_price: price.promotional_price,
          promotion_starts_at: 'promotion_starts_at' in price ? price.promotion_starts_at : null,
          promotion_ends_at: 'promotion_ends_at' in price ? price.promotion_ends_at : null,
          is_active: price.is_active,
          min_quantity: price.min_quantity,
        })
        .eq('id', existingPrice.id)
    } else {
      await supabaseAdmin.from('price_table_products').insert(price)
    }
  }

  // ── E11.10: Preços na Tabela B (valores diferentes da Tabela A — teste de isolamento)
  // Produto 1/VAR-001A: R$52,00 normal | R$46,00 promo VÁLIDA
  // Produto 1/VAR-001B: R$48,00 normal | sem promo
  // Produto 2/VAR-002A: R$140,00 normal | sem promo
  // Produto 2/VAR-002B: R$235,00 normal | sem promo
  console.log('💰 [E11] Preços na Tabela B...')
  const pricesTableB: PriceEntry[] = [
    {
      price_table_id: priceTableBId,
      product_id: productIds['E11-PROD-001'],
      variant_id: variantIds['E11-VAR-001A'],
      unit_price: 52.00,
      promotional_price: 46.00,
      promotion_starts_at: new Date('2020-01-01').toISOString(),
      promotion_ends_at: futureDate,
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableBId,
      product_id: productIds['E11-PROD-001'],
      variant_id: variantIds['E11-VAR-001B'],
      unit_price: 48.00,
      promotional_price: null as null,
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableBId,
      product_id: productIds['E11-PROD-002'],
      variant_id: variantIds['E11-VAR-002A'],
      unit_price: 140.00,
      promotional_price: null as null,
      is_active: true,
      min_quantity: 1,
    },
    {
      price_table_id: priceTableBId,
      product_id: productIds['E11-PROD-002'],
      variant_id: variantIds['E11-VAR-002B'],
      unit_price: 235.00,
      promotional_price: null as null,
      is_active: true,
      min_quantity: 1,
    },
  ]

  for (const price of pricesTableB) {
    const { data: existingPrice } = await supabaseAdmin
      .from('price_table_products')
      .select('id')
      .eq('price_table_id', price.price_table_id)
      .eq('product_id', price.product_id)
      .eq('variant_id', price.variant_id)
      .maybeSingle()

    if (existingPrice?.id) {
      await supabaseAdmin
        .from('price_table_products')
        .update({
          unit_price: price.unit_price,
          promotional_price: price.promotional_price,
          promotion_starts_at: 'promotion_starts_at' in price ? price.promotion_starts_at : null,
          promotion_ends_at: 'promotion_ends_at' in price ? price.promotion_ends_at : null,
          is_active: price.is_active,
          min_quantity: price.min_quantity,
        })
        .eq('id', existingPrice.id)
    } else {
      await supabaseAdmin.from('price_table_products').insert(price)
    }
  }

  // ── E11.11: Imagens dos produtos (1 por produto, idempotente)
  // Armazena caminho relativo no bucket product-images, não URL assinada
  console.log('🖼️ [E11] Imagens E11...')
  const e11Images = [
    { productSku: 'E11-PROD-001', url: 'products/e11-prod-001/primary.webp', alt: 'Pote Hermético 5L' },
    { productSku: 'E11-PROD-002', url: 'products/e11-prod-002/primary.webp', alt: 'Conjunto de Chaves' },
    { productSku: 'E11-PROD-003', url: 'products/e11-prod-003/primary.webp', alt: 'Caixa Organizadora' },
    { productSku: 'E11-PROD-004', url: 'products/e11-prod-004/primary.webp', alt: 'Produto Rascunho' },
  ]

  for (const img of e11Images) {
    const pId = productIds[img.productSku]
    const { data: existingImgE11 } = await supabaseAdmin
      .from('product_images')
      .select('id')
      .eq('product_id', pId)
      .eq('is_primary', true)
      .maybeSingle()

    if (!existingImgE11) {
      await supabaseAdmin.from('product_images').insert({
        product_id: pId,
        url: img.url,
        alt_text: img.alt,
        position: 0,
        is_primary: true,
      })
    }
  }

  // ── E11.12: Relatório de contagens
  console.log('\n📊 [E11] Contagens finais...')
  const [
    { count: catCount },
    { count: brandCount },
    { count: prodCount },
    { count: varCount },
    { count: ptCount },
    { count: ptpCount },
    { count: invCount },
  ] = await Promise.all([
    supabaseAdmin.from('categories').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('product_variants').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('price_tables').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('price_table_products').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('inventories').select('*', { count: 'exact', head: true }),
  ])

  console.log(`  Categorias:             ${catCount}`)
  console.log(`  Marcas:                 ${brandCount}`)
  console.log(`  Produtos:               ${prodCount}`)
  console.log(`  Variantes:              ${varCount}`)
  console.log(`  Tabelas de preço:       ${ptCount}`)
  console.log(`  Entradas de preço:      ${ptpCount}`)
  console.log(`  Registros de estoque:   ${invCount}`)

  console.log('\n✅ SEED IDEMPOTENTE EXECUTADO COM SUCESSO COMPLETO NO SUPABASE REMOTO!')
}

runSeed().catch((err) => {
  console.error('💥 Falha na execução do seed remoto:', err.message)
  process.exit(1)
})
