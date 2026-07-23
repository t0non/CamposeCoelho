import { createClient } from '@/lib/supabase/server'

export interface BrandDetailData {
  id: string
  name: string
  slug: string
  initials: string
  category?: string
  description: string
  itemCount: number
  metaTitle: string
  metaDescription: string
}

/**
 * Consulta real por slug de Marca no Supabase.
 */
export async function getBrandBySlug(slug: string): Promise<BrandDetailData | null> {
  if (!slug) return null
  const sanitizedSlug = slug.toLowerCase().trim()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, description, seo_title, seo_description, is_active')
    .eq('slug', sanitizedSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const brand = data as unknown as {
    id: string
    name: string
    slug: string
    description: string | null
    seo_title: string | null
    seo_description: string | null
    is_active: boolean
  }

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand.id)
    .eq('is_active', true)
    .eq('is_published', true)

  const metaTitle = brand.seo_title || `${brand.name} no Atacado B2B | Central Atacado`
  const metaDescription = brand.seo_description || `Compre produtos da marca ${brand.name} no atacado com faturamento exclusivo.`

  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    initials: brand.name.slice(0, 2).toUpperCase(),
    description: brand.description ?? `Linha de produtos ${brand.name} no atacado.`,
    itemCount: count ?? 0,
    metaTitle,
    metaDescription,
  }
}
