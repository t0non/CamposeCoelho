import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

export function invalidateCategoryCache(slug?: string) {
  if (slug) {
    revalidatePath(`/categoria/${slug}`)
  }
  revalidatePath('/catalogo')
  revalidatePath('/admin/categorias')
  // @ts-ignore - aceitamos a tag 'max' baseada na versão canária do Next
  revalidateTag('categories', 'max' as any)
}

export function invalidateBrandCache(slug?: string) {
  if (slug) {
    revalidatePath(`/marca/${slug}`)
  }
  revalidatePath('/catalogo')
  revalidatePath('/admin/marcas')
  revalidateTag('brands', 'max' as any)
}

export function invalidateProductCache(slug?: string) {
  if (slug) {
    revalidatePath(`/produto/${slug}`)
  }
  revalidatePath('/catalogo')
  revalidatePath('/admin/produtos')
  revalidateTag('products', 'max' as any)
}

export function invalidatePricingCache() {
  revalidatePath('/admin/tabelas-de-precos')
  revalidateTag('pricing', 'max' as any)
}

export function invalidateInventoryCache(productSlug?: string) {
  revalidatePath('/admin/estoque')
  if (productSlug) {
    revalidatePath(`/produto/${productSlug}`)
  }
}
