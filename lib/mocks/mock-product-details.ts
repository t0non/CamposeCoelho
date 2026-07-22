export interface ProductDetailInfo {
  ean: string
  ncm: string
  longDescription: string
  applications: string[]
  instructions: string
  warranty: string
  certifications: string[]
  packaging: {
    type: string
    unitsPerPackage: number
    unitsPerMasterBox: number
    packageDimensions: string
    packageWeight: string
    masterBoxDimensions: string
    masterBoxWeight: string
    stackabilityMax: string
  }
  additionalImages: string[]
  frequentlyBoughtTogetherIds: string[]
  relatedProductIds: string[]
}

export const mockProductDetailsMap: Record<string, ProductDetailInfo> = {
  'prod-1': {
    ean: '7891234567890',
    ncm: '1509.10.00',
    longDescription:
      'O Azeite Extra Virgem 500ml é produzido a partir de azeitonas selecionadas de prensa a frio. Apresenta acidez máxima de 0,2%, aroma frutado médio e sabor equilibrado. Embalado em caixa master de papelão reforçado com 12 garrafas de vidro escuro para preservação do produto.',
    applications: ['Revenda em supermercados', 'Mercearias e empórios', 'Restaurantes e serviços de alimentação'],
    instructions: 'Conservar em local seco, fresco e ao abrigo da luz solar direta.',
    warranty: '90 dias contra defeitos de fabricação ou vazamento.',
    certifications: ['ISO 9001', 'Selo de Qualidade Azeitona Premium', 'Certificação ANVISA'],
    packaging: {
      type: 'Garrafa de Vidro Escuro em Caixa de Papelão',
      unitsPerPackage: 1,
      unitsPerMasterBox: 12,
      packageDimensions: '8 x 8 x 26 cm',
      packageWeight: '850 g',
      masterBoxDimensions: '34 x 26 x 28 cm',
      masterBoxWeight: '10.5 kg',
      stackabilityMax: 'Até 5 caixas',
    },
    additionalImages: [
      '/placeholder-product.png',
      '/placeholder-product.png',
      '/placeholder-product.png',
    ],
    frequentlyBoughtTogetherIds: ['prod-5', 'prod-6'],
    relatedProductIds: ['prod-2', 'prod-5', 'prod-6'],
  },
  'prod-3': {
    ean: '7899876543210',
    ncm: '8203.20.10',
    longDescription:
      'Kit profissional com alicates universais de 8 polegadas fabricados em aço cromo vanádio de alta resistência. Cabo ergonômico emborrachado com isolamento térmico e elétrico até 1000V de acordo com a norma NBR 9699.',
    applications: ['Lojas de materiais de construção', 'Manutenção industrial', 'Instalações elétricas'],
    instructions: 'Utilizar sempre equipamentos de proteção individual ao manusear ferramentas elétricas.',
    warranty: '1 ano de garantia de fábrica.',
    certifications: ['NBR 9699', 'ISO 9001', 'Certificado de Isolamento 1000V'],
    packaging: {
      type: 'Blister Individual em Caixa Master',
      unitsPerPackage: 1,
      unitsPerMasterBox: 10,
      packageDimensions: '25 x 10 x 3 cm',
      packageWeight: '420 g',
      masterBoxDimensions: '30 x 26 x 22 cm',
      masterBoxWeight: '4.5 kg',
      stackabilityMax: 'Até 8 caixas',
    },
    additionalImages: [
      '/placeholder-product.png',
      '/placeholder-product.png',
    ],
    frequentlyBoughtTogetherIds: ['prod-11', 'prod-12', 'prod-13'],
    relatedProductIds: ['prod-11', 'prod-12', 'prod-14'],
  },
}

export function getProductDetailFallback(sku: string, name: string): ProductDetailInfo {
  return {
    ean: `789${sku.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)}`,
    ncm: '8471.60.52',
    longDescription: `${name} é um produto selecionado de alta qualidade comercial para revenda no atacado. Produzido sob rígidos padrões de fabricação para atender lojistas e distribuidores.`,
    applications: ['Revenda no varejo comercial', 'Abastecimento de estoque', 'Uso corporativo e industrial'],
    instructions: 'Manter em local seco e limpo. Consertar e armazenar conforme especificações do fabricante.',
    warranty: '90 dias contra defeitos de fabricação.',
    certifications: ['Certificação de Qualidade Atacadista B2B'],
    packaging: {
      type: 'Embalagem Comercial Reforçada',
      unitsPerPackage: 1,
      unitsPerMasterBox: 12,
      packageDimensions: '20 x 15 x 10 cm',
      packageWeight: '500 g',
      masterBoxDimensions: '40 x 30 x 25 cm',
      masterBoxWeight: '6.5 kg',
      stackabilityMax: 'Até 6 caixas',
    },
    additionalImages: ['/placeholder-product.png', '/placeholder-product.png'],
    frequentlyBoughtTogetherIds: ['prod-1', 'prod-3', 'prod-4'],
    relatedProductIds: ['prod-1', 'prod-2', 'prod-4', 'prod-5'],
  }
}
