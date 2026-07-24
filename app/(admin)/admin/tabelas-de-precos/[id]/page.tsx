import { requireAdmin } from '@/lib/supabase/auth'

export const metadata = { title: 'Admin — tabelas-de-precos / [id]' }
export default async function Page() {
  await requireAdmin()
  return <div className="space-y-4"><h1 className="text-2xl font-bold">tabelas-de-precos / [id]</h1><p>Placeholder estrutural.</p></div>
}
