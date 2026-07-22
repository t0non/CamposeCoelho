import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type BrandRow = Database['public']['Tables']['brands']['Row']

export async function getCategories() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, parent_id, position')
    .eq('is_active', true)
    .order('position')

  if (error) throw error
  return (data ?? []) as Pick<
    CategoryRow,
    'id' | 'name' | 'slug' | 'image_url' | 'parent_id' | 'position'
  >[]
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data as CategoryRow
}

export async function getBrands() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data ?? []) as Pick<BrandRow, 'id' | 'name' | 'slug' | 'logo_url'>[]
}

export async function getBrandBySlug(slug: string): Promise<BrandRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data as BrandRow
}
