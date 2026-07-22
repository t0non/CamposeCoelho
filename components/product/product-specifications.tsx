import { List } from 'lucide-react'
import type { FullProductData } from '@/lib/data/products'

interface ProductSpecificationsProps {
  product: FullProductData
}

export function ProductSpecifications({ product }: ProductSpecificationsProps) {
  const specs = [
    { label: 'Código SKU', value: product.sku },
    { label: 'Código EAN', value: product.detail.ean },
    { label: 'NCM', value: product.detail.ncm },
    { label: 'Marca', value: product.brand?.name ?? 'Não informada' },
    { label: 'Categoria', value: product.category?.name ?? 'Geral' },
    { label: 'Unidade de Venda', value: product.unit },
    { label: 'Embalagem Mínima', value: `${product.min_quantity} ${product.unit}` },
    { label: 'Garantia', value: product.detail.warranty },
    ...Object.entries(product.attributes).map(([k, v]) => ({ label: k, value: v })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <List className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-slate-900">Especificações Técnicas</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 text-xs">
        {specs.map((s, idx) => (
          <div
            key={s.label}
            className={`flex justify-between p-3.5 ${
              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
            }`}
          >
            <span className="font-semibold text-slate-600">{s.label}</span>
            <span className="font-bold text-slate-900 text-right">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
