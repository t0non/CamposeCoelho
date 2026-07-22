export interface BrandItem {
  id: string
  name: string
  slug: string
  initials: string
  category: string
}

export const mockBrands: BrandItem[] = [
  { id: 'b1', name: 'Marca Premium B2B', slug: 'marca-premium', initials: 'MP', category: 'Utilidades' },
  { id: 'b2', name: 'NutriMax Atacado', slug: 'nutrimax', initials: 'NM', category: 'Alimentos' },
  { id: 'b3', name: 'Ferramentas Pro', slug: 'ferramentas-pro', initials: 'FP', category: 'Ferramentas' },
  { id: 'b4', name: 'PapelMax B2B', slug: 'papelmax', initials: 'PX', category: 'Papelaria' },
  { id: 'b5', name: 'TechMaster', slug: 'techmaster', initials: 'TM', category: 'Eletrônicos' },
  { id: 'b6', name: 'DecorLar', slug: 'decorlar', initials: 'DL', category: 'Decoração' },
]
