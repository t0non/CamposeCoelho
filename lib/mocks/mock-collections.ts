export interface CollectionCampaign {
  id: string
  title: string
  slug: string
  description: string
  itemCount: number
  imageUrl: string
  ctaLabel: string
  badge?: string
  bgClass?: string
}

export const mockCollections: CollectionCampaign[] = [
  {
    id: 'c1',
    title: 'Volta às Aulas',
    slug: 'volta-as-aulas',
    description: 'Cadernos, mochilas, estojos e materiais de papelaria com preços de atacado.',
    itemCount: 145,
    imageUrl: '/placeholder-collection-1.png',
    ctaLabel: 'Ver Materiais',
    badge: 'Temporada',
  },
  {
    id: 'c2',
    title: 'Organização da Casa',
    slug: 'organizacao-casa',
    description: 'Caixas organizadoras, cestos, cabides e itens para deixar o lar em ordem.',
    itemCount: 210,
    imageUrl: '/placeholder-collection-2.png',
    ctaLabel: 'Conhecer Linha',
  },
  {
    id: 'c3',
    title: 'Diversão Infantil',
    slug: 'diversao-infantil',
    description: 'Brinquedos educativos, jogos pedagógicos e opções para presente.',
    itemCount: 180,
    imageUrl: '/placeholder-collection-3.png',
    ctaLabel: 'Explorar Brinquedos',
  },
  {
    id: 'c4',
    title: 'Ferramentas Essenciais',
    slug: 'ferramentas-essenciais',
    description: 'Kits de alicates, chaves, parafusadeiras e equipamentos de alta rotatividade.',
    itemCount: 95,
    imageUrl: '/placeholder-collection-4.png',
    ctaLabel: 'Ver Ferramentas',
    badge: 'Alta Procura',
  },
]
