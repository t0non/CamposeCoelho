'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    images: string[]
    unit: string
    min_quantity: number
    multiple_quantity: number
  } | null
}

/**
 * Hook para gerenciar o carrinho no lado do cliente.
 * Preços NÃO são buscados aqui — apenas metadados do produto.
 * A exibição de preços ocorre em Server Components.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchCart = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      setItems([])
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('cart_items')
      .select(
        `
        id, quantity, product_id,
        product:products!cart_items_product_id_fkey(
          id, name, slug, unit, min_quantity, multiple_quantity,
          product_images(image_url, is_primary)
        )
      `,
      )
      .eq('profile_id', user.user.id)
      .order('updated_at', { ascending: false })

    if (fetchError) {
      setError('Erro ao carregar o carrinho')
    } else {
      const mappedItems: CartItem[] = (data || []).map((item) => {
        const prod = Array.isArray(item.product) ? item.product[0] : item.product
        return {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: prod ? {
            id: prod.id,
            name: prod.name,
            slug: prod.slug,
            unit: prod.unit,
            min_quantity: prod.min_quantity,
            multiple_quantity: prod.multiple_quantity,
            images: prod.product_images?.map((img: { image_url: string }) => img.image_url) || []
          } : null
        }
      })
      setItems(mappedItems)
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, itemCount, loading, error, refetch: fetchCart }
}
