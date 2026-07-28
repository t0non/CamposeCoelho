import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth'
import { validateCNPJ } from '@/lib/utils/masks'
import type { Database } from '@/types/database.types'

type CompanyRow = Database['public']['Tables']['companies']['Row']
type AddressRow = Database['public']['Tables']['addresses']['Row']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/**
 * Interface para submissão ou atualização de dados empresariais do cliente.
 */
export interface SaveCompanyDataInput {
  cnpj: string
  company_name: string
  trade_name?: string
  state_registration?: string
  segment?: string
  phone?: string
  whatsapp?: string
  email?: string
  website?: string
  // Endereço
  zip_code: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

/**
 * Cria ou atualiza os dados da empresa e seu endereço para o usuário logado.
 */
export async function saveClientCompanyData(input: SaveCompanyDataInput): Promise<{ success: true; companyId: string | null }> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    throw new Error('Sessão expirada ou não autenticada.')
  }

  const cleanCNPJ = input.cnpj.replace(/\D/g, '')
  if (!validateCNPJ(cleanCNPJ)) {
    throw new Error('CNPJ inválido.')
  }

  const cleanZip = input.zip_code.replace(/\D/g, '')
  if (cleanZip.length !== 8) {
    throw new Error('CEP inválido.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as AnyClient

  // Checar se CNPJ já está cadastrado por outra empresa
  const { data: existingCnpj } = await supabase
    .from('companies')
    .select('id')
    .eq('cnpj', cleanCNPJ)
    .single()

  if (existingCnpj && existingCnpj.id !== ctx.user.company_id) {
    throw new Error('Este CNPJ já está cadastrado para outra empresa.')
  }

  let companyId = ctx.user.company_id

  if (!companyId) {
    // Criar nova empresa (via admin client para bypass de RLS após revoke)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient() as AnyClient

    const { data: newCompany, error: createError } = await adminClient
      .from('companies')
      .insert({
        cnpj: cleanCNPJ,
        company_name: input.company_name.trim(),
        trade_name: input.trade_name?.trim() || null,
        state_registration: input.state_registration?.trim() || null,
        segment: input.segment?.trim() || null,
        phone: input.phone?.replace(/\D/g, '') || null,
        whatsapp: input.whatsapp?.replace(/\D/g, '') || null,
        email: input.email?.trim() || ctx.user.email,
        website: input.website?.trim() || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError || !newCompany) {
      throw new Error(`Erro ao criar empresa: ${createError?.message || 'Falha desconhecida'}`)
    }

    companyId = newCompany.id

    // Vincular usuário como membro da empresa
    await adminClient.from('company_members').insert({
      company_id: companyId,
      profile_id: ctx.user.id,
      role: 'owner',
      is_primary: true,
    })

    // Atualizar perfil do usuário com company_id (profiles tem UPDATE para authenticated)
    await supabase
      .from('profiles')
      .update({ company_id: companyId })
      .eq('id', ctx.user.id)
  } else {
    // Atualizar empresa existente via admin client (pois revogamos UPDATE de companies para authenticated)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient() as AnyClient

    const { error: updateError } = await adminClient
      .from('companies')
      .update({
        cnpj: cleanCNPJ,
        company_name: input.company_name.trim(),
        trade_name: input.trade_name?.trim() || null,
        state_registration: input.state_registration?.trim() || null,
        segment: input.segment?.trim() || null,
        phone: input.phone?.replace(/\D/g, '') || null,
        whatsapp: input.whatsapp?.replace(/\D/g, '') || null,
        email: input.email?.trim() || ctx.user.email,
        website: input.website?.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (updateError) {
      throw new Error(`Erro ao atualizar empresa: ${updateError.message}`)
    }
  }

  // Cadastrar ou atualizar endereço comercial da empresa
  const { data: existingAddr } = await supabase
    .from('addresses')
    .select('id')
    .eq('company_id', companyId as string)
    .single()

  if (existingAddr) {
    await supabase
      .from('addresses')
      .update({
        zip_code: cleanZip,
        street: input.street.trim(),
        number: input.number.trim(),
        complement: input.complement?.trim() || null,
        neighborhood: input.neighborhood.trim(),
        city: input.city.trim(),
        state: input.state.trim().toUpperCase(),
        profile_id: ctx.user.id,
      })
      .eq('id', existingAddr.id)
  } else {
    await supabase.from('addresses').insert({
      company_id: companyId,
      profile_id: ctx.user.id,
      label: 'Endereço Comercial',
      zip_code: cleanZip,
      street: input.street.trim(),
      number: input.number.trim(),
      complement: input.complement?.trim() || null,
      neighborhood: input.neighborhood.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      is_default: true,
    })
  }

  // Criar notificação e audit log de submissão
  await supabase.from('notifications').insert({
    profile_id: ctx.user.id,
    title: 'Cadastro Enviado',
    message: 'Seus dados empresariais foram salvos e enviados para análise comercial.',
    type: 'company_submitted',
    link_url: '/minha-conta/empresa',
  })

  await supabase.from('audit_logs').insert({
    actor_id: ctx.user.id,
    action: 'company_data_saved',
    target_table: 'companies',
    target_id: companyId,
    payload: { cnpj: cleanCNPJ, company_name: input.company_name },
  })

  return { success: true, companyId }
}

/**
 * Reenvia um cadastro de empresa recusado para nova análise.
 */
export async function resubmitCompanyForReview() {
  const ctx = await getAuthContext()
  if (!ctx.user || !ctx.company) {
    throw new Error('Nenhuma empresa encontrada para reenvio.')
  }

  if (ctx.company.status !== 'rejected' && ctx.company.status !== 'pending') {
    throw new Error('Empresas já aprovadas não podem ser reenviadas.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as AnyClient

  const { createAdminClient } = await import('@/lib/supabase/admin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as AnyClient

  const { error } = await adminClient
    .from('companies')
    .update({
      status: 'pending',
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
      rejected_at: null,
    })
    .eq('id', ctx.company.id)

  if (error) {
    throw new Error(`Falha ao reenviar cadastro: ${error.message}`)
  }

  await supabase.from('notifications').insert({
    profile_id: ctx.user.id,
    title: 'Cadastro Reenviado',
    message: 'Seu cadastro empresarial foi reenviado e está sob nova análise.',
    type: 'company_resubmitted',
    link_url: '/conta-pendente',
  })

  await supabase.from('audit_logs').insert({
    actor_id: ctx.user.id,
    action: 'company_resubmitted',
    target_table: 'companies',
    target_id: ctx.company.id,
    payload: { resubmitted_at: new Date().toISOString() },
  })

  return { success: true }
}

/**
 * Gera URL assinada temporária para visualização de um documento.
 */
export async function getDocumentSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
  const ctx = await getAuthContext()
  if (!ctx.user) {
    throw new Error('Acesso negado. Usuário não autenticado.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('company-documents')
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao gerar link seguro: ${error?.message || 'Arquivo não encontrado'}`)
  }

  return data.signedUrl
}

/**
 * AÇÃO ADMINISTRATIVA: Aprovar uma empresa.
 */
export async function approveCompanyAdmin(companyId: string, internalNotes?: string) {
  const ctx = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as AnyClient

  const { data: company, error: fetchErr } = await supabase
    .from('companies')
    .select('id, company_name, status')
    .eq('id', companyId)
    .single()

  if (fetchErr || !company) {
    throw new Error('Empresa não encontrada.')
  }

  if (company.status === 'approved') {
    throw new Error('Esta empresa já foi aprovada anteriormente.')
  }

  const { data: defaultPriceTable } = await supabase
    .from('price_tables')
    .select('id')
    .eq('is_default', true)
    .single()

  const { createAdminClient } = await import('@/lib/supabase/admin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as AnyClient

  const { error: updateErr } = await adminClient
    .from('companies')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      price_table_id: defaultPriceTable?.id || null,
      internal_notes: internalNotes?.trim() || null,
    })
    .eq('id', companyId)

  if (updateErr) {
    throw new Error(`Falha ao aprovar empresa: ${updateErr.message}`)
  }

  const { data: members } = await supabase
    .from('company_members')
    .select('profile_id')
    .eq('company_id', companyId)

  if (members && members.length > 0) {
    for (const m of members) {
      await supabase.from('notifications').insert({
        profile_id: m.profile_id,
        title: 'Cadastro Aprovado! 🎉',
        message: 'Sua empresa foi aprovada. Você já pode visualizar preços e fazer pedidos no portal.',
        type: 'company_approved',
        link_url: '/minha-conta',
      })
    }
  }

  await supabase.from('audit_logs').insert({
    actor_id: ctx.user!.id,
    action: 'company_approved',
    target_table: 'companies',
    target_id: companyId,
    payload: { approved_at: new Date().toISOString(), internal_notes: internalNotes },
  })

  return { success: true }
}

/**
 * AÇÃO ADMINISTRATIVA: Recusar uma empresa com mensagem pública obrigatória.
 */
export async function rejectCompanyAdmin(companyId: string, rejectionReason: string, internalNotes?: string) {
  const ctx = await requireAdmin()

  if (!rejectionReason || rejectionReason.trim().length < 5) {
    throw new Error('Informe um motivo público de recusa claro para o cliente (mínimo 5 caracteres).')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as AnyClient

  const { data: company, error: fetchErr } = await supabase
    .from('companies')
    .select('id, status')
    .eq('id', companyId)
    .single()

  if (fetchErr || !company) {
    throw new Error('Empresa não encontrada.')
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as AnyClient

  const { error: updateErr } = await adminClient
    .from('companies')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
      internal_notes: internalNotes?.trim() || null,
    })
    .eq('id', companyId)

  if (updateErr) {
    throw new Error(`Falha ao recusar empresa: ${updateErr.message}`)
  }

  const { data: members } = await supabase
    .from('company_members')
    .select('profile_id')
    .eq('company_id', companyId)

  if (members && members.length > 0) {
    for (const m of members) {
      await supabase.from('notifications').insert({
        profile_id: m.profile_id,
        title: 'Atualização do Cadastro Empresarial',
        message: `Seu cadastro necessita de correções: ${rejectionReason.trim()}`,
        type: 'company_rejected',
        link_url: '/conta-recusada',
      })
    }
  }

  await supabase.from('audit_logs').insert({
    actor_id: ctx.user!.id,
    action: 'company_rejected',
    target_table: 'companies',
    target_id: companyId,
    payload: { rejection_reason: rejectionReason, internal_notes: internalNotes },
  })

  return { success: true }
}

/**
 * AÇÃO ADMINISTRATIVA: Atribuir vendedor responsável a uma empresa.
 */
export async function assignSellerAdmin(companyId: string, sellerId: string | null) {
  const ctx = await requireAdmin()

  const { createAdminClient } = await import('@/lib/supabase/admin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as AnyClient

  const { error } = await adminClient
    .from('companies')
    .update({ seller_id: sellerId })
    .eq('id', companyId)

  if (error) {
    throw new Error(`Falha ao atribuir vendedor: ${error.message}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as AnyClient
  await supabase.from('audit_logs').insert({
    actor_id: ctx.user!.id,
    action: 'seller_assigned',
    target_table: 'companies',
    target_id: companyId,
    payload: { seller_id: sellerId },
  })

  return { success: true }
}
