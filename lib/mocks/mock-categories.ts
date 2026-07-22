export interface CategoryCardData {
  id: string
  name: string
  slug: string
  itemCount: number
  imageUrl: string
  badgeText?: string
}

export const mockCategoriesList: CategoryCardData[] = [
  {
    id: '1',
    name: 'Utilidades Domésticas',
    slug: 'utilidades',
    itemCount: 480,
    imageUrl: '/placeholder-cat-utilidades.png',
    badgeText: 'Mais Vendidos',
  },
  {
    id: '2',
    name: 'Brinquedos & Jogos',
    slug: 'brinquedos',
    itemCount: 320,
    imageUrl: '/placeholder-cat-brinquedos.png',
  },
  {
    id: '3',
    name: 'Ferramentas & Acessórios',
    slug: 'ferramentas',
    itemCount: 250,
    imageUrl: '/placeholder-cat-ferramentas.png',
  },
  {
    id: '4',
    name: 'Papelaria & Escritório',
    slug: 'papelaria',
    itemCount: 190,
    imageUrl: '/placeholder-cat-papelaria.png',
  },
  {
    id: '5',
    name: 'Eletrônicos & Áudio',
    slug: 'eletronicos',
    itemCount: 140,
    imageUrl: '/placeholder-cat-eletronicos.png',
    badgeText: 'Lançamento',
  },
  {
    id: '6',
    name: 'Decoração & Lar',
    slug: 'decoracao',
    itemCount: 210,
    imageUrl: '/placeholder-cat-decoracao.png',
  },
]
