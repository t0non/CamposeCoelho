/**
 * Script para criar um usuário admin diretamente no Supabase.
 * Rode com: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szntzeclwouyidfossrk.supabase.co'
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ADMIN_EMAIL = 'admin@camposecoelho.com.br'
const ADMIN_PASSWORD = 'Admin@2026!'

async function main() {
  console.log('🔧 Criando cliente admin do Supabase...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 1. Criar o usuário no Auth
  console.log(`📧 Criando usuário: ${ADMIN_EMAIL}`)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Já confirma o e-mail automaticamente
  })

  if (authError) {
    // Se já existe, tenta buscar
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      console.log('⚠️  Usuário já existe no Auth. Buscando ID...')
      
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('❌ Erro ao listar usuários:', listError.message)
        process.exit(1)
      }

      const existingUser = listData.users.find((u) => u.email === ADMIN_EMAIL)
      if (!existingUser) {
        console.error('❌ Não consegui encontrar o usuário existente.')
        process.exit(1)
      }

      console.log(`✅ Encontrado! ID: ${existingUser.id}`)

      // Atualizar o perfil para admin
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: existingUser.id,
          role: 'admin',
          full_name: 'Administrador',
          email: ADMIN_EMAIL,
        }, { onConflict: 'id' })

      if (upsertError) {
        console.error('❌ Erro ao atualizar perfil:', upsertError.message)
        process.exit(1)
      }

      console.log('✅ Perfil atualizado para admin!')
    } else {
      console.error('❌ Erro ao criar usuário:', authError.message)
      process.exit(1)
    }
  } else {
    const userId = authData.user.id
    console.log(`✅ Usuário criado! ID: ${userId}`)

    // 2. Criar o perfil com role = admin
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'admin',
        full_name: 'Administrador',
        email: ADMIN_EMAIL,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message)
      process.exit(1)
    }

    console.log('✅ Perfil admin criado!')
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  🎉 ADMIN CRIADO COM SUCESSO!')
  console.log('═══════════════════════════════════════════')
  console.log(`  📧 E-mail:  ${ADMIN_EMAIL}`)
  console.log(`  🔑 Senha:   ${ADMIN_PASSWORD}`)
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('Faça login em http://localhost:3000/login')
  console.log('Você será redirecionado para /admin automaticamente.')
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
