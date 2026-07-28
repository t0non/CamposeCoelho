import type { PriceInfo } from '@/types/product.types'

/**
 * Tabela de Preços Protegidos (Simulação de banco privado).
 * NUNCA é importada diretamente nos componentes públicos.
 * Apenas acessada pela camada de dados (lib/data/catalog.ts) quando canViewPrices === true.
 */
export const mockProtectedPrices: Record<string, PriceInfo> = {
  'prod-1': { unit_price: 289.90, promotional_price: 260.91, effective_price: 260.91, is_on_promotion: true },
  'prod-2': { unit_price: 319.00, promotional_price: null, effective_price: 319.00, is_on_promotion: false },
  'prod-3': { unit_price: 450.00, promotional_price: 399.00, effective_price: 399.00, is_on_promotion: true },
  'prod-4': { unit_price: 185.00, promotional_price: null, effective_price: 185.00, is_on_promotion: false },
  'prod-5': { unit_price: 129.90, promotional_price: 109.90, effective_price: 109.90, is_on_promotion: true },
  'prod-6': { unit_price: 89.00, promotional_price: null, effective_price: 89.00, is_on_promotion: false },
  'prod-7': { unit_price: 210.00, promotional_price: 189.00, effective_price: 189.00, is_on_promotion: true },
  'prod-8': { unit_price: 75.50, promotional_price: null, effective_price: 75.50, is_on_promotion: false },
  'prod-9': { unit_price: 349.90, promotional_price: 299.90, effective_price: 299.90, is_on_promotion: true },
  'prod-10': { unit_price: 199.00, promotional_price: null, effective_price: 199.00, is_on_promotion: false },
  'prod-11': { unit_price: 420.00, promotional_price: 379.00, effective_price: 379.00, is_on_promotion: true },
  'prod-12': { unit_price: 159.90, promotional_price: null, effective_price: 159.90, is_on_promotion: false },
  'prod-13': { unit_price: 275.00, promotional_price: 245.00, effective_price: 245.00, is_on_promotion: true },
  'prod-14': { unit_price: 98.00, promotional_price: null, effective_price: 98.00, is_on_promotion: false },
  'prod-15': { unit_price: 510.00, promotional_price: 459.00, effective_price: 459.00, is_on_promotion: true },
  'prod-16': { unit_price: 142.00, promotional_price: null, effective_price: 142.00, is_on_promotion: false },
  'prod-17': { unit_price: 380.00, promotional_price: 339.00, effective_price: 339.00, is_on_promotion: true },
  'prod-18': { unit_price: 115.00, promotional_price: null, effective_price: 115.00, is_on_promotion: false },
  'prod-19': { unit_price: 230.00, promotional_price: 199.90, effective_price: 199.90, is_on_promotion: true },
  'prod-20': { unit_price: 168.00, promotional_price: null, effective_price: 168.00, is_on_promotion: false },
}
