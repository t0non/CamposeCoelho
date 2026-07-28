export interface HeroBannerItem {
  id: string
  title: string
  subtitle: string
  description: string
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  desktopImage: string
  mobileImage: string
  theme: 'dark' | 'light'
}

export const mockHeroBanners: HeroBannerItem[] = [
  {
    id: 'banner-1',
    title: 'Variedade para sua empresa vender mais',
    subtitle: 'CATÁLOGO B2B EXCLUSIVO',
    description:
      'Encontre produtos para revenda, condições exclusivas para CNPJ e um catálogo preparado para abastecer o seu negócio com alta rentabilidade.',
    primaryCta: { label: 'Explorar Catálogo', href: '/catalogo' },
    secondaryCta: { label: 'Cadastrar Minha Empresa', href: '/cadastro' },
    desktopImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop',
    mobileImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=600&auto=format&fit=crop',
    theme: 'dark',
  },
  {
    id: 'banner-2',
    title: 'Abasteça sua loja sem complicação',
    subtitle: 'COMPRAS NO ATACADO',
    description:
      'Escolha seus produtos por lotes ou caixas fechadas, monte o pedido e acompanhe cada etapa da entrega em um único lugar.',
    primaryCta: { label: 'Conhecer Categorias', href: '/catalogo' },
    desktopImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
    mobileImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop',
    theme: 'dark',
  },
  {
    id: 'banner-3',
    title: 'Condições exclusivas para empresas',
    subtitle: 'CONDIÇÕES FATURADAS',
    description:
      'Cadastre seu CNPJ para consultar preços da tabela atacadista, disponibilidade imediata de estoque e facilidade no faturamento.',
    primaryCta: { label: 'Solicitar Cadastro', href: '/cadastro' },
    secondaryCta: { label: 'Já tenho cadastro', href: '/login' },
    desktopImage: 'https://images.unsplash.com/photo-1556741533-6e40ce36a0fb?q=80&w=1200&auto=format&fit=crop',
    mobileImage: 'https://images.unsplash.com/photo-1556741533-6e40ce36a0fb?q=80&w=600&auto=format&fit=crop',
    theme: 'dark',
  },
]
