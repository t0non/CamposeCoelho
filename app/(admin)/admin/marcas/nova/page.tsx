import { requireAdmin } from '@/lib/supabase/auth'
import { BrandForm } from '../brand-form'

export const metadata = { title: 'Admin — Nova Marca' }

export default async function NewBrandPage() {
  await requireAdmin()
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova Marca</h1>
        <p className="text-gray-500 text-sm mt-1">Crie uma nova marca para associar aos seus produtos.</p>
      </div>
      <div className="bg-white p-6 rounded-md border border-gray-200">
        <BrandForm />
      </div>
    </div>
  )
}
