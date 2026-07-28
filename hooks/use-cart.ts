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
        id, quantity,
        product:products!cart_items_product_id_fkey(
          id, name, slug, images, unit, min_quantity, multiple_quantity
        )
      `,
      )
      .eq('profile_id', user.user.id)
      .order('updated_at', { ascending: false })

    if (fetchError) {
      setError('Erro ao carregar o carrinho')
    } else {
      setItems((data as CartItem[]) ?? [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, itemCount, loading, error, refetch: fetchCart }
}
