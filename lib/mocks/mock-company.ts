export interface CompanyConfig {
  name: string
  slogan: string
  cnpj: string
  address: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  contact: {
    phone: string
    whatsapp: string
    whatsappMessage: string
    email: string
    supportEmail: string
    workingHours: string
  }
  announcementBar: {
    messages: string[]
    minOrderValue: number
  }
  socialLinks: {
    instagram: string
    facebook: string
    youtube: string
    linkedin: string
  }
  footerLinks: {
    institucional: { label: string; href: string }[]
    categorias: { label: string; href: string }[]
    minhaConta: { label: string; href: string }[]
  }
}

export const mockCompany: CompanyConfig = {
  name: 'Central Atacado',
  slogan: 'Variedade para o seu negócio crescer',
  cnpj: '00.123.456/0001-89',
  address: {
    street: 'Av. das Indústrias Atacadistas',
    number: '1500',
    neighborhood: 'Distrito Industrial',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01000-000',
  },
  contact: {
    phone: '(11) 4004-8888',
    whatsapp: '(11) 98888-7777',
    whatsappMessage: 'Olá! Gostaria de informações sobre compras no atacado.',
    email: 'contato@centralatacado.com.br',
    supportEmail: 'atendimento@centralatacado.com.br',
    workingHours: 'Segunda a Sexta, das 08h às 18h',
  },
  announcementBar: {
    messages: [
      '🏢 Venda exclusiva para empresas (CNPJ)',
      '📦 Pedido mínimo de R$ 1.000,00',
      '🚚 Atendimento e entregas para todo o Brasil',
      '💳 Condições faturadas em até 60 dias para cadastros aprovados',
    ],
    minOrderValue: 1000,
  },
  socialLinks: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    linkedin: 'https://linkedin.com',
  },
  footerLinks: {
    institucional: [
      { label: 'Quem Somos', href: '#' },
      { label: 'Como Comprar no Atacado', href: '#' },
      { label: 'Política de Privacidade', href: '#' },
      { label: 'Termos e Condições de Uso', href: '#' },
      { label: 'Trocas e Devoluções', href: '#' },
      { label: 'Trabalhe Conosco', href: '#' },
    ],
    categorias: [
      { label: 'Utilidades Domésticas', href: '/categoria/utilidades' },
      { label: 'Brinquedos & Infantil', href: '/categoria/brinquedos' },
      { label: 'Ferramentas & Hardware', href: '/categoria/ferramentas' },
      { label: 'Papelaria & Escritório', href: '/categoria/papelaria' },
      { label: 'Eletrônicos & Acessórios', href: '/categoria/eletronicos' },
    ],
    minhaConta: [
      { label: 'Entrar na Conta', href: '/login' },
      { label: 'Cadastrar Empresa', href: '/cadastro' },
      { label: 'Meus Pedidos', href: '/minha-conta/pedidos' },
      { label: 'Favoritos', href: '/minha-conta/favoritos' },
      { label: 'Endereços de Entrega', href: '/minha-conta/enderecos' },
    ],
  },
}
