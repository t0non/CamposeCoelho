import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminCategoryById } from '@/lib/data/admin-catalog'
import { CategoryForm } from '../category-form'

export const metadata = { title: 'Admin — Editar Categoria' }

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  try {
    const category = await getAdminCategoryById(id)
    if (!category) notFound()

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Editar Categoria</h1>
          <p className="text-gray-500 text-sm mt-1">Atualize os detalhes de {category.name}.</p>
        </div>
        <div className="bg-white p-6 rounded-md border border-gray-200">
          <CategoryForm initialData={category} />
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
