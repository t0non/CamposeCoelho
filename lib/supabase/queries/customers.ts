import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/auth'
import type { Database } from '@/types/database.types'

type CompanyStatus = Database['public']['Enums']['company_status']

/**
 * Lista clientes para o painel admin.
 * Requer role=admin.
 */
export async function getCustomers(options?: {
  status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  await requireAdmin()
  const supabase = await createAdminClient()

  let query = supabase
    .from('companies')
    .select(
      `
      id, cnpj, company_name, status, created_at,
      profiles(id, full_name, email, phone, created_at)
    `,
    )
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status as CompanyStatus)
  }
  if (options?.search) {
    query = query.or(
      `company_name.ilike.%${options.search}%,cnpj.ilike.%${options.search}%`,
    )
  }

  const { data, error } = await query.range(
    options?.offset ?? 0,
    (options?.offset ?? 0) + (options?.limit ?? 20) - 1,
  )

  if (error) throw error
  return data ?? []
}

/**
 * Busca detalhes de um cliente específico.
 * Requer role=admin.
 */
export async function getCustomerById(companyId: string) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('companies')
    .select(
      `
      *,
      profiles(*)
    `,
    )
    .eq('id', companyId)
    .single()

  if (error) return null
  return data
}

/**
 * Aprova, rejeita ou suspende o cadastro de uma empresa.
 * Requer role=admin. Usa service_role para bypass de RLS.
 */
export async function updateCompanyStatus(
  companyId: string,
  status: 'approved' | 'rejected' | 'suspended',
  internalNotes?: string,
) {
  await requireAdmin()
  const supabase = await createAdminClient()

  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companiesTable = (supabase as any).from('companies')
  const { error } = await companiesTable
    .update({
      status,
      internal_notes: internalNotes ?? null,
      approved_at: status === 'approved' ? now : null,
      rejected_at: status === 'rejected' ? now : null,
      updated_at: now,
    })
    .eq('id', companyId)

  if (error) throw error
}
