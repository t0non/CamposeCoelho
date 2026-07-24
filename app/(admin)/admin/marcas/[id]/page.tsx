import { requireAdmin } from '@/lib/supabase/auth'

export const metadata = { title: 'Admin — marcas / [id]' }
export default async function Page() {
  await requireAdmin()
  return <div className="space-y-4"><h1 className="text-2xl font-bold">marcas / [id]</h1><p>Placeholder estrutural.</p></div>
}
