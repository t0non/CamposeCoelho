import type { Database } from './database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type AddressRow = Database['public']['Tables']['addresses']['Row']

export interface CustomerListItem {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'phone' | 'created_at'>
  company: Pick<
    CompanyRow,
    'id' | 'cnpj' | 'company_name' | 'status' | 'created_at'
  >
}

export interface CustomerDetail {
  profile: ProfileRow & { email: string }
  company: CompanyRow
  addresses: AddressRow[]
}

export type { ProfileRow, CompanyRow, AddressRow }
