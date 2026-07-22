import { mockDepartments, type DepartmentItem } from '@/lib/mocks/mock-navigation'
import { mockCategoriesList } from '@/lib/mocks/mock-categories'

export interface CategoryDetailData {
  id: string
  name: string
  slug: string
  description: string
  longDescription: string
  imageUrl: string
  itemCount: number
  metaTitle: string
  metaDescription: string
  subcategories: { name: string; slug: string }[]
  availableAttributes: Record<string, string[]>
}

const mockCategoryDetails: Record<string, CategoryDetailData> = {
  utilidades: {
    id: 'cat-1',
    name: 'Utilidades Domésticas',
    slug: 'utilidades',
    description: 'Panelas, organização, limpeza, potes e utensílios de cozinha para atacado.',
    longDescription:
      'Abasteça seu comércio com a linha completa de utilidades domésticas da Central Atacado. Oferecemos kits, caixas fechadas e conjuntos com margens excelentes para revenda.',
    imageUrl: '/placeholder-cat-utilidades.png',
    itemCount: 480,
    metaTitle: 'Utilidades Domésticas no Atacado | Central Atacado B2B',
    metaDescription: 'Compre utilidades domésticas direto do distribuidor. Preços de atacado para lojistas com CNPJ.',
    subcategories: [
      { name: 'Cozinha', slug: 'cozinha' },
      { name: 'Organização', slug: 'organizacao' },
      { name: 'Limpeza', slug: 'limpeza' },
      { name: 'Banheiro & Lavanderia', slug: 'banheiro-lavanderia' },
    ],
    availableAttributes: {
      Material: ['Vidro', 'Aco Inox', 'Plastico', 'Aluminio'],
      Ambiente: ['Cozinha', 'Lavanderia', 'Quarto', 'Banheiro'],
    },
  },
  brinquedos: {
    id: 'cat-5',
    name: 'Brinquedos & Jogos',
    slug: 'brinquedos',
    description: 'Jogos educativos, bonecas, carrinhos e brinquedos pedagógicos.',
    longDescription:
      'Renove a seção infantil da sua loja com brinquedos testados e certificados. Opções para todas as faixas etárias com faturamento B2B.',
    imageUrl: '/placeholder-cat-brinquedos.png',
    itemCount: 320,
    metaTitle: 'Brinquedos no Atacado B2B | Central Atacado',
    metaDescription: 'Brinquedos educativos, carrinhos e jogos no atacado para revenda.',
    subcategories: [
      { name: 'Educativos', slug: 'educativos' },
      { name: 'Bonecas', slug: 'bonecas' },
      { name: 'Carrinhos & Pistas', slug: 'carrinhos-pistas' },
      { name: 'Jogos de Tabuleiro', slug: 'jogos-tabuleiro' },
    ],
    availableAttributes: {
      FaixaEtaria: ['3+ anos', '6+ anos', '8+ anos'],
      Material: ['Plastico ABS', 'Vinil Soft', 'Madeira'],
    },
  },
  ferramentas: {
    id: 'cat-3',
    name: 'Ferramentas & Acessórios',
    slug: 'ferramentas',
    description: 'Ferramentas manuais, elétricas, medição e maletas completas.',
    longDescription:
      'Ferramentas de alta rotatividade para depósitos de construção, ferragens e revendas. Alicates, furadeiras e materiais com garantia.',
    imageUrl: '/placeholder-cat-ferramentas.png',
    itemCount: 250,
    metaTitle: 'Ferramentas no Atacado | Central Atacado B2B',
    metaDescription: 'Ferramentas manuais e elétricas no atacado com faturamento exclusivo para empresas.',
    subcategories: [
      { name: 'Manuais', slug: 'manuais' },
      { name: 'Elétricas', slug: 'eletricas' },
      { name: 'Medição', slug: 'medicao' },
    ],
    availableAttributes: {
      Voltagem: ['220V', '110V', 'Bivolt', 'Isolado 1000V'],
      Material: ['Aco Cromo', 'Aco Carbono'],
    },
  },
  papelaria: {
    id: 'cat-4',
    name: 'Papelaria & Escritório',
    slug: 'papelaria',
    description: 'Papel sulfite, cadernos, canetas, grampeadores e itens escolares.',
    longDescription:
      'Suprimentos corporativos e artigos escolares no atacado. Caixas fechadas de papel sulfite A4 e materiais de alta demanda.',
    imageUrl: '/placeholder-cat-papelaria.png',
    itemCount: 190,
    metaTitle: 'Papelaria no Atacado B2B | Central Atacado',
    metaDescription: 'Papelaria e suprimentos de escritório no atacado com entregas para todo o Brasil.',
    subcategories: [
      { name: 'Escolar', slug: 'escolar' },
      { name: 'Escritório', slug: 'escritorio' },
    ],
    availableAttributes: {
      Gramatura: ['75g', '90g'],
      Formato: ['A4', 'Carta'],
    },
  },
  eletronicos: {
    id: 'cat-6',
    name: 'Eletrônicos & Áudio',
    slug: 'eletronicos',
    description: 'Cabos, carregadores turbo, fones Bluetooth e caixas de som.',
    longDescription:
      'Acessórios de celular e periféricos de informática com forte margem de lucro para bancas, lojas de conveniência e tecnologia.',
    imageUrl: '/placeholder-cat-eletronicos.png',
    itemCount: 140,
    metaTitle: 'Eletrônicos e Acessórios no Atacado | Central Atacado',
    metaDescription: 'Cabos USB, fones TWS e carregadores no atacado B2B.',
    subcategories: [
      { name: 'Acessórios Celular', slug: 'acessorios-celular' },
      { name: 'Áudio', slug: 'audio' },
      { name: 'Informática', slug: 'informatica' },
    ],
    availableAttributes: {
      Conectividade: ['Bluetooth 5.3', 'USB-C Turbo', '2.4GHz'],
    },
  },
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDetailData | null> {
  const normalized = slug.toLowerCase()
  return mockCategoryDetails[normalized] ?? null
}
