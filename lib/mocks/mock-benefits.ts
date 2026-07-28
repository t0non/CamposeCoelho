export interface BenefitItem {
  id: string
  title: string
  description: string
  iconName: 'Building2' | 'Boxes' | 'Headset' | 'Truck'
}

export const mockBenefits: BenefitItem[] = [
  {
    id: 'b1',
    title: 'Compra exclusiva para empresas',
    description: 'Condições comerciais direcionadas a lojistas, revendedores e empresas.',
    iconName: 'Building2',
  },
  {
    id: 'b2',
    title: 'Grande variedade',
    description: 'Categorias diversificadas para abastecer diferentes perfis de comércio.',
    iconName: 'Boxes',
  },
  {
    id: 'b3',
    title: 'Atendimento especializado',
    description: 'Equipe comercial preparada para ajudar na montagem de pedidos e cotações.',
    iconName: 'Headset',
  },
  {
    id: 'b4',
    title: 'Entrega para todo o Brasil',
    description: 'Opções de transporte e frete rodoviário ajustadas à sua região.',
    iconName: 'Truck',
  },
]
