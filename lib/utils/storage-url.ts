/**
 * lib/utils/storage-url.ts
 * Helper centralizado para conversão de caminhos de imagens do Supabase Storage em URLs públicas.
 */

export function getProductImageUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder-product.png'
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`
}
