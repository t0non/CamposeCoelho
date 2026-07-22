export interface TestimonialItem {
  id: string
  name: string
  role: string
  company: string
  city: string
  state: string
  text: string
  rating: number
  isMockNotice?: boolean
}

export const mockTestimonials: TestimonialItem[] = [
  {
    id: 't1',
    name: 'Marcos Roberto',
    role: 'Gerente de Compras',
    company: 'Mercado & Conveniência Silva',
    city: 'Campinas',
    state: 'SP',
    text: '“Comprar pela Central Atacado facilitou muito a reposição do nosso estoque. O sistema de pedidos mínimos por lote é transparente e a entrega cumpre os prazos.”',
    rating: 5,
    isMockNotice: true,
  },
  {
    id: 't2',
    name: 'Juliana Mendes',
    role: 'Proprietária',
    company: 'Mendes Papelaria & Bazar',
    city: 'Ribeirão Preto',
    state: 'SP',
    text: '“A variedade de marcas e o atendimento atacadista nos dão segurança para planejar as compras da temporada. O cadastro de CNPJ foi rápido e prático.”',
    rating: 5,
    isMockNotice: true,
  },
  {
    id: 't3',
    name: 'Fernando Augusto',
    role: 'Diretor Comercial',
    company: 'Distribuidora Norte Alimentos',
    city: 'São José dos Campos',
    state: 'SP',
    text: '“Faturamento facilitado e preços realmente competitivos para revenda. A plataforma é fácil de navegar e o acompanhamento de pedidos funciona muito bem.”',
    rating: 5,
    isMockNotice: true,
  },
]
