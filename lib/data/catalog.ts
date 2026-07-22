import type { AuthContext } from '@/types/auth.types'
import type { CatalogProduct } from '@/types/product.types'
import { mockProductsList, type PublicCatalogProduct } from '@/lib/mocks/mock-products'
import { mockProtectedPrices } from '@/lib/mocks/mock-protected-prices'
import type { CatalogParams } from '@/lib/utils/catalog-params'

export interface CatalogResult {
  products: CatalogProduct[]
  total: number
  page: number
  perPage: number
  totalPages: number
  canViewPrices: boolean
  userStatus: 'visitor' | 'pending' | 'approved' | 'rejected' | 'suspended'
}

export interface CatalogFilterOptions {
  categories: { name: string; slug: string; count: number }[]
  subcategories: { name: string; slug: string; count: number }[]
  brands: { name: string; slug: string; count: number }[]
  units: string[]
  availableAttributes: Record<string, string[]>
  priceBounds?: { min: number; max: number }
}

/**
 * Filtra, ordena e pagina os produtos do catálogo com estrita proteção de preços.
 */
export async function getCatalogProducts(
  params: CatalogParams,
  authContext: AuthContext,
): Promise<CatalogResult> {
  const canViewPrices = Boolean(authContext?.canViewPrices)
  const userStatus = authContext?.company?.status ?? (authContext?.user ? 'pending' : 'visitor')

  let filtered: PublicCatalogProduct[] = [...mockProductsList]

  // 1. Filtro por Busca Termo (q)
  if (params.query) {
    const q = params.query.toLowerCase().trim()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand?.name.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q) ||
        Object.values(p.attributes).some((v) => v.toLowerCase().includes(q)),
    )
  }

  // 2. Filtro por Categoria
  if (params.category) {
    filtered = filtered.filter(
      (p) => p.category?.slug.toLowerCase() === params.category!.toLowerCase(),
    )
  }

  // 3. Filtro por Subcategoria
  if (params.subcategory) {
    filtered = filtered.filter(
      (p) => p.subcategorySlug?.toLowerCase() === params.subcategory!.toLowerCase(),
    )
  }

  // 4. Filtro por Marcas (Múltiplas)
  if (params.brands && params.brands.length > 0) {
    const brandSlugs = params.brands.map((b) => b.toLowerCase())
    filtered = filtered.filter(
      (p) => p.brand && brandSlugs.includes(p.brand.slug.toLowerCase()),
    )
  }

  // 5. Filtro por Disponibilidade
  if (params.availability) {
    filtered = filtered.filter((p) => p.stockStatus === params.availability)
  }

  // 6. Toggles: Lançamentos / Promoções / Mais Vendidos
  if (params.isNew) filtered = filtered.filter((p) => p.isNew)
  if (params.isPromotion) filtered = filtered.filter((p) => p.isPromotion)
  if (params.isBestSeller) filtered = filtered.filter((p) => p.isBestSeller)

  // 7. Filtro por Faixa de Quantidade Mínima
  if (params.minQuantityRange) {
    if (params.minQuantityRange === 'up_to_6') filtered = filtered.filter((p) => p.min_quantity <= 6)
    else if (params.minQuantityRange === '7_to_12') filtered = filtered.filter((p) => p.min_quantity >= 7 && p.min_quantity <= 12)
    else if (params.minQuantityRange === '13_to_24') filtered = filtered.filter((p) => p.min_quantity >= 13 && p.min_quantity <= 24)
    else if (params.minQuantityRange === '25_plus') filtered = filtered.filter((p) => p.min_quantity >= 25)
  }

  // 8. Filtro por Unidade de Venda
  if (params.unit) {
    filtered = filtered.filter((p) => p.unit.toLowerCase() === params.unit!.toLowerCase())
  }

  // 9. Filtro por Atributos Dinâmicos (ex: Material, Voltagem)
  if (params.attributes) {
    Object.entries(params.attributes).forEach(([attrKey, allowedValues]) => {
      if (allowedValues && allowedValues.length > 0) {
        const allowedLower = allowedValues.map((v) => v.toLowerCase())
        filtered = filtered.filter((p) => {
          const val = p.attributes[attrKey]
          return val && allowedLower.includes(val.toLowerCase())
        })
      }
    })
  }

  // 10. Filtro e Ordenação por Preço (EXCLUSIVO PARA USUÁRIOS AUTORIZADOS)
  let resultList: CatalogProduct[] = []

  if (canViewPrices) {
    // Anexar preços privados aos produtos filtrados
    let listWithPrices: CatalogProduct[] = filtered.map((p) => ({
      ...p,
      price: mockProtectedPrices[p.id] ?? {
        unit_price: 199.90,
        promotional_price: null,
        effective_price: 199.90,
        is_on_promotion: false,
      },
    }))

    // Filtro por faixa de preço (minPrice / maxPrice)
    if (params.minPrice !== undefined) {
      listWithPrices = listWithPrices.filter(
        (p) => p.price && p.price.effective_price >= params.minPrice!,
      )
    }
    if (params.maxPrice !== undefined) {
      listWithPrices = listWithPrices.filter(
        (p) => p.price && p.price.effective_price <= params.maxPrice!,
      )
    }

    // Ordenação por preço
    if (params.sort === 'menor-preco') {
      listWithPrices.sort((a, b) => (a.price?.effective_price ?? 0) - (b.price?.effective_price ?? 0))
    } else if (params.sort === 'maior-preco') {
      listWithPrices.sort((a, b) => (b.price?.effective_price ?? 0) - (a.price?.effective_price ?? 0))
    }

    resultList = listWithPrices
  } else {
    // Para visitantes ou clientes não aprovados: NENHUM objeto de preço é incluído ou consultado!
    resultList = filtered.map(({ ...publicProduct }) => publicProduct)
  }

  // Ordenações Padrão (Sem preço)
  if (params.sort === 'nome-asc') {
    resultList.sort((a, b) => a.name.localeCompare(b.name))
  } else if (params.sort === 'nome-desc') {
    resultList.sort((a, b) => b.name.localeCompare(a.name))
  }

  // 11. Paginação Real
  const total = resultList.length
  const page = params.page ?? 1
  const perPage = params.perPage ?? 12
  const totalPages = Math.ceil(total / perPage) || 1

  const startIndex = (page - 1) * perPage
  const paginatedProducts = resultList.slice(startIndex, startIndex + perPage)

  return {
    products: paginatedProducts,
    total,
    page,
    perPage,
    totalPages,
    canViewPrices,
    userStatus,
  }
}

/**
 * Retorna as opções de filtros disponíveis baseadas no catálogo.
 */
export async function getCatalogFilterOptions(
  params: CatalogParams,
  authContext: AuthContext,
): Promise<CatalogFilterOptions> {
  const canViewPrices = Boolean(authContext?.canViewPrices)

  const categories = [
    { name: 'Utilidades Domésticas', slug: 'utilidades', count: 12 },
    { name: 'Brinquedos & Jogos', slug: 'brinquedos', count: 8 },
    { name: 'Ferramentas & Acessórios', slug: 'ferramentas', count: 14 },
    { name: 'Papelaria & Escritório', slug: 'papelaria', count: 6 },
    { name: 'Eletrônicos & Áudio', slug: 'eletronicos', count: 9 },
    { name: 'Decoração & Lar', slug: 'decoracao', count: 5 },
  ]

  const subcategories = [
    { name: 'Cozinha', slug: 'cozinha', count: 6 },
    { name: 'Organização', slug: 'organizacao', count: 4 },
    { name: 'Manuais', slug: 'manuais', count: 5 },
    { name: 'Elétricas', slug: 'eletricas', count: 4 },
    { name: 'Educativos', slug: 'educativos', count: 3 },
  ]

  const brands = [
    { name: 'Marca Premium B2B', slug: 'marca-premium', count: 12 },
    { name: 'NutriMax Atacado', slug: 'nutrimax', count: 5 },
    { name: 'Ferramentas Pro', slug: 'ferramentas-pro', count: 14 },
    { name: 'PapelMax B2B', slug: 'papelmax', count: 6 },
    { name: 'TechMaster', slug: 'techmaster', count: 9 },
    { name: 'DecorLar', slug: 'decorlar', count: 5 },
    { name: 'PlayToys B2B', slug: 'playtoys', count: 8 },
  ]

  const units = ['CX', 'FD', 'UN', 'KT', 'PC']

  const availableAttributes = {
    Material: ['Vidro', 'Aco Inox', 'Plastico', 'Aluminio', 'Aco Cromo'],
    Voltagem: ['220V', '110V', 'Bivolt', 'Isolado 1000V'],
  }

  return {
    categories,
    subcategories,
    brands,
    units,
    availableAttributes,
    priceBounds: canViewPrices ? { min: 50, max: 1000 } : undefined,
  }
}
