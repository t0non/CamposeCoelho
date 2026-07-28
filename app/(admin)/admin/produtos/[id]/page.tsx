import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminProductById, getAdminProductVariants, getAdminProductImages } from '@/lib/data/admin-products'
import { getAdminCategories, getAdminBrands } from '@/lib/data/admin-catalog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ProductForm } from '@/components/admin/ProductForm'
import { ProductVariantsSection } from '@/components/admin/ProductVariantsSection'
import { ProductImageGallery } from '@/components/admin/ProductImageGallery'
import { ProductImageUploader } from '@/components/admin/ProductImageUploader'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toggleProductStatusAction, publishProductAction, unpublishProductAction } from '@/app/actions/catalog'
import { ProductPublishButton } from '@/components/admin/ProductPublishButton'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  // Validar UUID
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
    notFound()
  }

  const product = await getAdminProductById(id)
  if (!product) {
    notFound()
  }

  const [categories, brands, variants, images] = await Promise.all([
    getAdminCategories(),
    getAdminBrands(),
    getAdminProductVariants(id),
    getAdminProductImages(id),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/produtos" className="inline-flex items-center justify-center p-2 rounded-md hover:bg-slate-100 text-slate-700 bg-transparent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <AdminPageHeader
            title="Editar Produto"
            description={product.name}
          />
        </div>
        <ProductPublishButton
          productId={product.id}
          isPublished={product.is_published}
          isActive={product.is_active}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <ProductForm
            initialData={product}
            categories={categories.data}
            brands={brands.data}
          />

          <ProductVariantsSection
            productId={product.id}
            variants={variants}
          />
        </div>

        <div className="space-y-6">
          <ProductImageUploader productId={product.id} />
          <div className="bg-white p-4 border rounded-md">
            <h3 className="font-medium text-lg mb-4">Galeria</h3>
            <ProductImageGallery productId={product.id} images={images} />
          </div>
        </div>
      </div>
    </div>
  )
}
