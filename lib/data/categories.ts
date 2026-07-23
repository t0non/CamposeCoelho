import { createClient } from '@/lib/supabase/server'

export interface CategoryDetailData {
  id: string
  name: string
  slug: string
  description: string
  longDescription: string
  imageUrl: string
  itemCount: number
  metaTitle: string
  metaDescription: string
  subcategories: { name: string; slug: string }[]
  availableAttributes: Record<string, string[]>
}

/**
 * Consulta real por slug de Categoria no Supabase.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryDetailData | null> {
  if (!slug) return null
  const sanitizedSlug = slug.toLowerCase().trim()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, seo_title, seo_description, is_active')
    .eq('slug', sanitizedSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const cat = data as unknown as {
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
    .eq('category_id', cat.id)
    .eq('is_active', true)
    .eq('is_published', true)

  const metaTitle = cat.seo_title || `${cat.name} no Atacado | Central Atacado B2B`
  const metaDescription = cat.seo_description || `Compre produtos de ${cat.name} no atacado direto do distribuidor para revenda.`

  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? `Produtos da categoria ${cat.name} no atacado.`,
    longDescription: cat.description ?? `Compre produtos da categoria ${cat.name} no atacado com faturamento exclusivo para empresas.`,
    imageUrl: '/placeholder-category.png',
    itemCount: count ?? 0,
    metaTitle,
    metaDescription,
    subcategories: [],
    availableAttributes: {},
  }
}
