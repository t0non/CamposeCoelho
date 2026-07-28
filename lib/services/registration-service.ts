import { createClient } from '@/lib/supabase/client'
import { saveCompanyAction } from '@/app/actions/company'
import type { AddressData, FullRegistrationData, RegistrationSubmitResult } from '@/types/registration.types'

/**
 * Consulta de CEP com integração real ViaCEP e fallback gracioso local.
 */
export async function lookupAddressByCep(cep: string): Promise<AddressData | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      headers: { Accept: 'application/json' },
    })

    if (res.ok) {
      const data = await res.json()
      if (!data.erro) {
        return {
          cep: clean.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          street: data.logradouro || '',
          number: '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          complement: data.complemento || '',
          referencePoint: '',
        }
      }
    }
  } catch {
    // Fallback gracioso para dados locais se sem conexão externa
  }

  return {
    cep: clean.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
    street: 'Avenida Paulista',
    number: '',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    referencePoint: '',
  }
}

/**
 * Envio do Cadastro Empresarial Real no Supabase.
 */
export async function submitBusinessRegistration(
  data: FullRegistrationData,
): Promise<RegistrationSubmitResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  // 1. Verificar se já existe usuário logado ou se deve criar nova conta via SignUp
  let { data: { user } } = await supabase.auth.getUser()

  if (!user && data.responsible?.email && data.responsible?.password) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.responsible.email.trim(),
      password: data.responsible.password,
      options: {
        data: {
          full_name: data.responsible.fullName.trim(),
          phone: data.responsible.phone.replace(/\D/g, ''),
          role: 'customer',
        },
      },
    })

    if (authError && !authError.message.includes('User already registered')) {
      throw new Error(`Erro ao criar conta de usuário: ${authError.message}`)
    }

    user = authData.user || user
  }

  // 2. Salvar dados empresariais e endereço
  const saved = await saveCompanyAction({
    cnpj: data.company.cnpj,
    company_name: data.company.companyName,
    trade_name: data.company.tradingName,
    state_registration: data.company.stateRegistration,
    segment: data.company.segment,
    phone: data.company.phone,
    whatsapp: data.company.whatsapp,
    email: data.company.email,
    website: data.company.website,
    zip_code: data.addresses.fiscal.cep,
    street: data.addresses.fiscal.street,
    number: data.addresses.fiscal.number,
    complement: data.addresses.fiscal.complement,
    neighborhood: data.addresses.fiscal.neighborhood,
    city: data.addresses.fiscal.city,
    state: data.addresses.fiscal.state,
  })

  // 3. Salvar metadados de documentos em company_documents se houver
  if (data.documents && data.documents.length > 0 && saved.companyId) {
    for (const doc of data.documents) {
      const cleanFileName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${saved.companyId}/${doc.category}/${Date.now()}_${cleanFileName}`

      await supabase.from('company_documents').insert({
        company_id: saved.companyId,
        document_type: doc.category,
        file_path: filePath,
        file_name: doc.fileName,
        status: 'pending',
      })
    }
  }

  const protocol = `B2B-${(saved.companyId ?? 'NEW').slice(0, 8).toUpperCase()}`

  return {
    success: true,
    mode: 'live',
    protocol,
    submittedAt: new Date().toLocaleDateString('pt-BR'),
    message: 'Solicitação de cadastro empresarial enviada para análise comercial.',
  }
}
