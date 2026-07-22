import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct, PriceInfo } from '@/types/product.types'
import { mockProductsList, type PublicCatalogProduct } from '@/lib/mocks/mock-products'
import { mockProtectedPrices } from '@/lib/mocks/mock-protected-prices'
import {
  mockProductDetailsMap,
  getProductDetailFallback,
  type ProductDetailInfo,
} from '@/lib/mocks/mock-product-details'
import {
  mockVolumeDiscountsMap,
  getVolumeDiscountFallback,
  type VolumeDiscountTier,
} from '@/lib/mocks/mock-volume-discounts'

export interface FullProductData extends PublicCatalogProduct {
  price?: PriceInfo
  detail: ProductDetailInfo
  volumeDiscounts?: VolumeDiscountTier[]
  exactStock?: number
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

/**
 * Busca produto por slug com estrita separação entre público e protegido.
 */
export async function getProductBySlug(
  slug: string,
  authContext: AuthContext,
): Promise<FullProductData | null> {
  const publicProduct = mockProductsList.find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase(),
  )

  if (!publicProduct) return null

  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')

  const detailInfo =
    mockProductDetailsMap[publicProduct.id] ??
    getProductDetailFallback(publicProduct.sku, publicProduct.name)

  let priceInfo = undefined
  let volumeDiscounts = undefined
  let exactStock = undefined

  if (canViewPrices) {
    priceInfo = mockProtectedPrices[publicProduct.id] ?? {
      unit_price: 199.90,
      promotional_price: null,
      effective_price: 199.90,
      is_on_promotion: false,
    }

    volumeDiscounts =
      mockVolumeDiscountsMap[publicProduct.id] ??
      getVolumeDiscountFallback(priceInfo.effective_price)

    exactStock = 240
  }

  return {
    ...publicProduct,
    price: priceInfo,
    detail: detailInfo,
    volumeDiscounts,
    exactStock,
    canViewPrices,
    userStatus,
  }
}

/**
 * Retorna produtos relacionados (excluindo o produto atual).
 */
export async function getRelatedProducts(
  currentProduct: FullProductData,
  authContext: AuthContext,
): Promise<CatalogProduct[]> {
  const canViewPrices = Boolean(authContext?.canViewPrices)

  const relatedIds = currentProduct.detail.relatedProductIds ?? []
  const filtered = mockProductsList.filter(
    (p) => p.id !== currentProduct.id && (relatedIds.includes(p.id) || p.category?.slug === currentProduct.category?.slug),
  )

  return filtered.slice(0, 4).map((p) => {
    if (!canViewPrices) {
      return p
    }
    return {
      ...p,
      price: mockProtectedPrices[p.id] ?? {
        unit_price: 199.90,
        promotional_price: null,
        effective_price: 199.90,
        is_on_promotion: false,
      },
    }
  })
}

/**
 * Retorna produtos "Comprados Juntos".
 */
export async function getFrequentlyBoughtTogether(
  currentProduct: FullProductData,
  authContext: AuthContext,
): Promise<CatalogProduct[]> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const ids = currentProduct.detail.frequentlyBoughtTogetherIds ?? []

  const matched = mockProductsList.filter((p) => ids.includes(p.id))

  return matched.slice(0, 3).map((p) => {
    if (!canViewPrices) {
      return p
    }
    return {
      ...p,
      price: mockProtectedPrices[p.id] ?? {
        unit_price: 150.00,
        promotional_price: null,
        effective_price: 150.00,
        is_on_promotion: false,
      },
    }
  })
}
