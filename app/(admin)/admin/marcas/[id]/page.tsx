import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminBrandById } from '@/lib/data/admin-catalog'
import { BrandForm } from '../brand-form'

export const metadata = { title: 'Admin — Editar Marca' }

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  try {
    const brand = await getAdminBrandById(id)
    if (!brand) notFound()

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Editar Marca</h1>
          <p className="text-gray-500 text-sm mt-1">Atualize os detalhes de {brand.name}.</p>
        </div>
        <div className="bg-white p-6 rounded-md border border-gray-200">
          <BrandForm initialData={brand} />
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
