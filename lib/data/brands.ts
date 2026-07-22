import { mockBrands, type BrandItem } from '@/lib/mocks/mock-brands'

export interface BrandDetailData extends BrandItem {
  description: string
  itemCount: number
  metaTitle: string
  metaDescription: string
}

const mockBrandDetails: Record<string, BrandDetailData> = {
  'marca-premium': {
    id: 'b-1',
    name: 'Marca Premium B2B',
    slug: 'marca-premium',
    initials: 'MP',
    category: 'Utilidades Domésticas',
    description: 'Linha completa de utilidades domésticas e conjuntos de cozinha em aço inox de alta durabilidade.',
    itemCount: 85,
    metaTitle: 'Produtos Marca Premium no Atacado | Central Atacado',
    metaDescription: 'Compre produtos da Marca Premium no atacado com faturamento exclusivo para lojistas CNPJ.',
  },
  'nutrimax': {
    id: 'b-2',
    name: 'NutriMax Atacado',
    slug: 'nutrimax',
    initials: 'NM',
    category: 'Alimentos & Bebidas',
    description: 'Cafés especiais, grãos selecionados e fardos promocionais para supermercados e mercearias.',
    itemCount: 42,
    metaTitle: 'NutriMax Atacado B2B | Central Atacado',
    metaDescription: 'Fardos de café e produtos alimentos NutriMax no atacado.',
  },
  'ferramentas-pro': {
    id: 'b-3',
    name: 'Ferramentas Pro',
    slug: 'ferramentas-pro',
    initials: 'FP',
    category: 'Ferramentas',
    description: 'Equipamentos elétricos, alicates isolados e maletas de aço cromo para uso profissional.',
    itemCount: 110,
    metaTitle: 'Ferramentas Pro no Atacado | Central Atacado B2B',
    metaDescription: 'Linha profissional de ferramentas elétricas e manuais Ferramentas Pro no atacado.',
  },
  'papelmax': {
    id: 'b-4',
    name: 'PapelMax B2B',
    slug: 'papelmax',
    initials: 'PX',
    category: 'Papelaria',
    description: 'Caixas de papel sulfite A4 75g e suprimentos corporativos de alta demanda.',
    itemCount: 65,
    metaTitle: 'PapelMax no Atacado | Central Atacado',
    metaDescription: 'Papel sulfite A4 e artigos de papelaria PapelMax no atacado.',
  },
}

export async function getBrandBySlug(slug: string): Promise<BrandDetailData | null> {
  const normalized = slug.toLowerCase()
  return mockBrandDetails[normalized] ?? null
}
