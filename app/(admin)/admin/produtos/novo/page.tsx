import { requireAdmin } from '@/lib/supabase/auth'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { getAdminCategories, getAdminBrands } from '@/lib/data/admin-catalog'
import { ProductForm } from '@/components/admin/ProductForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  await requireAdmin()

  const { data: categories } = await getAdminCategories()
  const { data: brands } = await getAdminBrands()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/produtos" className="inline-flex items-center justify-center p-2 rounded-md hover:bg-slate-100 text-slate-700 bg-transparent transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <AdminPageHeader
          title="Novo Produto"
          description="Preencha as informações básicas. O produto será criado como rascunho."
        />
      </div>

      <ProductForm
        categories={categories}
        brands={brands}
      />
    </div>
  )
}
