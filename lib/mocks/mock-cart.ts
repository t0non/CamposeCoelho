import type { PriceInfo } from '@/types/product.types'

export interface MockCartLineItem {
  id: string
  productId: string
  sku: string
  name: string
  slug: string
  unit: string
  quantity: number
  minQuantity: number
  imageUrl: string
  price?: PriceInfo
}

export const mockCartData: {
  items: MockCartLineItem[]
  subtotal: number
  totalItems: number
} = {
  items: [
    {
      id: 'cart-item-1',
      productId: 'prod-1',
      sku: 'AZ-500-CX12',
      name: 'Caixa de Azeite Extra Virgem 500ml (Cx c/ 12 unidades)',
      slug: 'azeite-extra-virgem-500ml-cx12',
      unit: 'CX',
      quantity: 5,
      minQuantity: 5,
      imageUrl: '/placeholder-product.png',
      price: {
        unit_price: 289.9,
        promotional_price: 260.91,
        effective_price: 260.91,
        is_on_promotion: true,
      },
    },
    {
      id: 'cart-item-2',
      productId: 'prod-2',
      sku: 'CF-500-FD20',
      name: 'Fardo de Café Torrado e Moído 500g (Fardo c/ 20 pacotes)',
      slug: 'cafe-torrado-moido-500g-fd20',
      unit: 'FD',
      quantity: 2,
      minQuantity: 2,
      imageUrl: '/placeholder-product.png',
      price: {
        unit_price: 319.0,
        promotional_price: null,
        effective_price: 319.0,
        is_on_promotion: false,
      },
    },
  ],
  subtotal: 1942.55,
  totalItems: 7,
}
