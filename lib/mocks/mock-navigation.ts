export interface DepartmentItem {
  id: string
  name: string
  slug: string
  iconName?: string
  isFeatured?: boolean
  badge?: string
  subcategories?: {
    name: string
    slug: string
    items?: { name: string; slug: string }[]
  }[]
  promoBanner?: {
    title: string
    subtitle: string
    image: string
    link: string
  }
}

export const mockDepartments: DepartmentItem[] = [
  {
    id: 'utilidades',
    name: 'Utilidades',
    slug: 'utilidades',
    iconName: 'Home',
    subcategories: [
      {
        name: 'Cozinha',
        slug: 'cozinha',
        items: [
          { name: 'Panelas & Frigideiras', slug: 'panelas-frigideiras' },
          { name: 'Talheres & Utensílios', slug: 'talheres-utensilios' },
          { name: 'Potes & Organizadores', slug: 'potes-organizadores' },
          { name: 'Garrafas & Copos', slug: 'garrafas-copos' },
        ],
      },
      {
        name: 'Organização',
        slug: 'organizacao',
        items: [
          { name: 'Caixas Organizadoras', slug: 'caixas-organizadoras' },
          { name: 'Cabides', slug: 'cabides' },
          { name: 'Cestos Multiuso', slug: 'cestos-multiuso' },
        ],
      },
      {
        name: 'Limpeza',
        slug: 'limpeza',
        items: [
          { name: 'Rodos & Vassouras', slug: 'rodos-vassouras' },
          { name: 'Kits Lixeira & Balde', slug: 'kits-lixeira-balde' },
          { name: 'Flanelas & Panos', slug: 'flanelas-panos' },
        ],
      },
      {
        name: 'Banheiro & Lavanderia',
        slug: 'banheiro-lavanderia',
        items: [
          { name: 'Porta Sabonete & Acessórios', slug: 'porta-sabonete' },
          { name: 'Varais & Pregadores', slug: 'varais-pregadores' },
        ],
      },
    ],
    promoBanner: {
      title: 'Festival da Cozinha B2B',
      subtitle: 'Descontos de até 25% na compra de caixas fechadas',
      image: '/placeholder-promo-1.png',
      link: '/categoria/utilidades',
    },
  },
  {
    id: 'brinquedos',
    name: 'Brinquedos',
    slug: 'brinquedos',
    iconName: 'Gamepad2',
    subcategories: [
      {
        name: 'Educativos & Pedagógicos',
        slug: 'educativos',
        items: [
          { name: 'Blocos de Montar', slug: 'blocos-montar' },
          { name: 'Quebra-cabeças', slug: 'quebra-cabecas' },
          { name: 'Jogos de Tabuleiro', slug: 'jogos-tabuleiro' },
        ],
      },
      {
        name: 'Bonecas & Carrinhos',
        slug: 'bonecas-carrinhos',
        items: [
          { name: 'Bonecas & Acessórios', slug: 'bonecas' },
          { name: 'Carrinhos & Pistas', slug: 'carrinhos-pistas' },
          { name: 'Controle Remoto', slug: 'controle-remoto' },
        ],
      },
      {
        name: 'Primeira Infância (Bebês)',
        slug: 'primeira-infancia',
        items: [
          { name: 'Chocalhos & Mordedores', slug: 'chocalhos-mordedores' },
          { name: 'Tapetes de Atividades', slug: 'tapetes-atividades' },
        ],
      },
    ],
  },
  {
    id: 'ferramentas',
    name: 'Ferramentas',
    slug: 'ferramentas',
    iconName: 'Wrench',
    subcategories: [
      {
        name: 'Ferramentas Manuais',
        slug: 'manuais',
        items: [
          { name: 'Alicates & Chaves', slug: 'alicates-chaves' },
          { name: 'Martelos & Serrotes', slug: 'martelos-serrotes' },
          { name: 'Jogos de Ferramentas', slug: 'jogos-ferramentas' },
        ],
      },
      {
        name: 'Ferramentas Elétricas',
        slug: 'eletricas',
        items: [
          { name: 'Furadeiras & Parafusadeiras', slug: 'furadeiras' },
          { name: 'Lixadeiras & Esmerilhadeiras', slug: 'lixadeiras' },
        ],
      },
      {
        name: 'Medição & Organização',
        slug: 'medicao-organizacao',
        items: [
          { name: 'Trena & Níveis', slug: 'trenas-niveis' },
          { name: 'Maletas de Ferramentas', slug: 'maletas' },
        ],
      },
    ],
  },
  {
    id: 'papelaria',
    name: 'Papelaria',
    slug: 'papelaria',
    iconName: 'BookOpen',
    subcategories: [
      {
        name: 'Escolar',
        slug: 'escolar',
        items: [
          { name: 'Cadernos & Blocos', slug: 'cadernos' },
          { name: 'Lápis, Canetas & Canetinhas', slug: 'canetas-lapis' },
          { name: 'Estojos & Mochilas', slug: 'estojos-mochilas' },
        ],
      },
      {
        name: 'Escritório',
        slug: 'escritorio',
        items: [
          { name: 'Sulfite & Papéis', slug: 'papel-sulfite' },
          { name: 'Grampeadores & Clipes', slug: 'grampeadores' },
          { name: 'Pastas & Arquivos', slug: 'pastas-arquivos' },
        ],
      },
    ],
  },
  {
    id: 'eletronicos',
    name: 'Eletrônicos',
    slug: 'eletronicos',
    iconName: 'Smartphone',
    subcategories: [
      {
        name: 'Acessórios Celular',
        slug: 'acessorios-celular',
        items: [
          { name: 'Cabos & Carregadores', slug: 'cabos-carregadores' },
          { name: 'Suportes & Capas', slug: 'suportes-capas' },
          { name: 'Películas de Proteção', slug: 'peliculas' },
        ],
      },
      {
        name: 'Áudio & Informática',
        slug: 'audio-informatica',
        items: [
          { name: 'Fones de Ouvido', slug: 'fones-ouvido' },
          { name: 'Caixas de Som Bluetooth', slug: 'caixas-som' },
          { name: 'Mouses & Teclados', slug: 'mouses-teclados' },
        ],
      },
    ],
  },
  {
    id: 'decoracao',
    name: 'Decoração',
    slug: 'decoracao',
    iconName: 'Sparkles',
  },
  {
    id: 'beleza',
    name: 'Beleza',
    slug: 'beleza',
    iconName: 'Scissors',
  },
  {
    id: 'infantil',
    name: 'Infantil',
    slug: 'infantil',
    iconName: 'Baby',
  },
  {
    id: 'pet',
    name: 'Pet Shop',
    slug: 'pet',
    iconName: 'Dog',
  },
  {
    id: 'ofertas',
    name: 'Ofertas B2B',
    slug: 'ofertas',
    badge: 'PROMO',
    isFeatured: true,
  },
  {
    id: 'lancamentos',
    name: 'Lançamentos',
    slug: 'lancamentos',
    badge: 'NOVO',
    isFeatured: true,
  },
]
