import { requireAdmin } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/server'
import ImportarPlanilhaClient from './client'

export const dynamic = 'force-dynamic'

export default async function ImportarProdutosPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: priceTables } = await supabase
    .from('price_tables')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return <ImportarPlanilhaClient initialPriceTables={priceTables || []} />
}
