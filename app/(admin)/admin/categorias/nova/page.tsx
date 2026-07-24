import { requireAdmin } from '@/lib/supabase/auth'
import { CategoryForm } from '../category-form'

export const metadata = { title: 'Admin — Nova Categoria' }

export default async function NewCategoryPage() {
  await requireAdmin()
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova Categoria</h1>
        <p className="text-gray-500 text-sm mt-1">Crie uma nova categoria para organizar seus produtos.</p>
      </div>
      <div className="bg-white p-6 rounded-md border border-gray-200">
        <CategoryForm />
      </div>
    </div>
  )
}
