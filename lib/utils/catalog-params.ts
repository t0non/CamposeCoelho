export type CatalogSort =
  | 'relevancia'
  | 'mais-vendidos'
  | 'lancamentos'
  | 'nome-asc'
  | 'nome-desc'
  | 'menor-preco'
  | 'maior-preco'

export interface CatalogParams {
  query?: string
  category?: string
  subcategory?: string
  brands?: string[]
  availability?: string
  isNew?: boolean
  isPromotion?: boolean
  isBestSeller?: boolean
  minQuantityRange?: string
  unit?: string
  attributes?: Record<string, string[]>
  minPrice?: number
  maxPrice?: number
  sort?: CatalogSort
  page?: number
  perPage?: number
}

/**
 * Converte ReadonlyURLSearchParams ou objeto de busca em CatalogParams validados.
 * Sanitiza valores e remove parâmetros de preço caso canViewPrices seja false.
 */
export function parseCatalogParams(
  rawParams: Record<string, string | string[] | undefined>,
  canViewPrices = false,
): CatalogParams {
  const getSingle = (key: string): string | undefined => {
    const val = rawParams[key]
    if (Array.isArray(val)) return val[0]
    return val
  }

  const getArray = (key: string): string[] => {
    const val = rawParams[key]
    if (!val) return []
    if (Array.isArray(val)) return val.filter(Boolean)
    return val.split(',').filter(Boolean)
  }

  const query = getSingle('q')?.trim() || getSingle('query')?.trim()
  const category = getSingle('categoria') || getSingle('category')
  const subcategory = getSingle('subcategoria') || getSingle('subcategory')
  const brands = getArray('marca').concat(getArray('brands'))
  const availability = getSingle('disponibilidade') || getSingle('availability')
  const isNew = getSingle('novidade') === '1' || getSingle('isNew') === 'true'
  const isPromotion = getSingle('promo') === '1' || getSingle('isPromotion') === 'true'
  const isBestSeller = getSingle('maisVendido') === '1' || getSingle('isBestSeller') === 'true'
  const minQuantityRange = getSingle('minQtyRange')
  const unit = getSingle('unidade') || getSingle('unit')

  // Leitura de Atributos dinâmicos (ex: attr_material=Vidro,Inox)
  const attributes: Record<string, string[]> = {}
  Object.keys(rawParams).forEach((key) => {
    if (key.startsWith('attr_')) {
      const attrName = key.replace('attr_', '')
      attributes[attrName] = getArray(key)
    }
  })

  // Leitura de ordenação com fallback seguro
  let rawSort = (getSingle('ordenacao') || getSingle('sort') || 'relevancia') as CatalogSort
  if ((rawSort === 'menor-preco' || rawSort === 'maior-preco') && !canViewPrices) {
    rawSort = 'relevancia'
  }

  // Preço só é aceito se o usuário tiver autorização
  let minPrice: number | undefined = undefined
  let maxPrice: number | undefined = undefined

  if (canViewPrices) {
    const rawMin = parseFloat(getSingle('minPrice') || '')
    const rawMax = parseFloat(getSingle('maxPrice') || '')
    if (!isNaN(rawMin) && rawMin >= 0) minPrice = rawMin
    if (!isNaN(rawMax) && rawMax > 0) maxPrice = rawMax
  }

  // Paginação sanitizada (clamp 12..48)
  const rawPage = parseInt(getSingle('page') || '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage

  const rawPerPage = parseInt(getSingle('perPage') || '12', 10)
  const perPage = [12, 24, 36, 48].includes(rawPerPage) ? rawPerPage : 12

  return {
    query: query || undefined,
    category: category || undefined,
    subcategory: subcategory || undefined,
    brands: brands.length > 0 ? Array.from(new Set(brands)) : undefined,
    availability: availability || undefined,
    isNew,
    isPromotion,
    isBestSeller,
    minQuantityRange: minQuantityRange || undefined,
    unit: unit || undefined,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    minPrice,
    maxPrice,
    sort: rawSort,
    page,
    perPage,
  }
}

/**
 * Converte CatalogParams em uma string de URL searchParams limpa.
 */
export function buildCatalogQueryString(
  params: CatalogParams,
  overrides?: Partial<CatalogParams>,
): string {
  const merged = { ...params, ...overrides }
  const search = new URLSearchParams()

  if (merged.query) search.set('q', merged.query)
  if (merged.category) search.set('categoria', merged.category)
  if (merged.subcategory) search.set('subcategoria', merged.subcategory)

  if (merged.brands && merged.brands.length > 0) {
    search.set('marca', merged.brands.join(','))
  }

  if (merged.availability) search.set('disponibilidade', merged.availability)
  if (merged.isNew) search.set('novidade', '1')
  if (merged.isPromotion) search.set('promo', '1')
  if (merged.isBestSeller) search.set('maisVendido', '1')
  if (merged.minQuantityRange) search.set('minQtyRange', merged.minQuantityRange)
  if (merged.unit) search.set('unidade', merged.unit)

  if (merged.minPrice !== undefined) search.set('minPrice', merged.minPrice.toString())
  if (merged.maxPrice !== undefined) search.set('maxPrice', merged.maxPrice.toString())

  if (merged.sort && merged.sort !== 'relevancia') {
    search.set('ordenacao', merged.sort)
  }

  if (merged.page && merged.page > 1) {
    search.set('page', merged.page.toString())
  }

  if (merged.perPage && merged.perPage !== 12) {
    search.set('perPage', merged.perPage.toString())
  }

  if (merged.attributes) {
    Object.entries(merged.attributes).forEach(([attrKey, values]) => {
      if (values && values.length > 0) {
        search.set(`attr_${attrKey}`, values.join(','))
      }
    })
  }

  const str = search.toString()
  return str ? `?${str}` : ''
}
