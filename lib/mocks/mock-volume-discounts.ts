export interface VolumeDiscountTier {
  minQuantity: number
  maxQuantity?: number
  pricePerUnit: number
  discountPercentage: number
}

/**
 * Descontos progressivos de volume por lote de produto (Simulação de tabela de preços privada B2B).
 * NUNCA é enviada para visitantes ou clientes não aprovados.
 */
export const mockVolumeDiscountsMap: Record<string, VolumeDiscountTier[]> = {
  'prod-1': [
    { minQuantity: 1, maxQuantity: 4, pricePerUnit: 260.91, discountPercentage: 0 },
    { minQuantity: 5, maxQuantity: 9, pricePerUnit: 247.86, discountPercentage: 5 },
    { minQuantity: 10, pricePerUnit: 234.82, discountPercentage: 10 },
  ],
  'prod-2': [
    { minQuantity: 1, maxQuantity: 3, pricePerUnit: 319.00, discountPercentage: 0 },
    { minQuantity: 4, maxQuantity: 7, pricePerUnit: 303.05, discountPercentage: 5 },
    { minQuantity: 8, pricePerUnit: 287.10, discountPercentage: 10 },
  ],
  'prod-3': [
    { minQuantity: 1, maxQuantity: 2, pricePerUnit: 399.00, discountPercentage: 0 },
    { minQuantity: 3, maxQuantity: 5, pricePerUnit: 379.05, discountPercentage: 5 },
    { minQuantity: 6, pricePerUnit: 359.10, discountPercentage: 10 },
  ],
}

export function getVolumeDiscountFallback(basePrice: number): VolumeDiscountTier[] {
  return [
    { minQuantity: 1, maxQuantity: 4, pricePerUnit: basePrice, discountPercentage: 0 },
    { minQuantity: 5, maxQuantity: 9, pricePerUnit: Math.round(basePrice * 0.95 * 100) / 100, discountPercentage: 5 },
    { minQuantity: 10, pricePerUnit: Math.round(basePrice * 0.90 * 100) / 100, discountPercentage: 10 },
  ]
}
