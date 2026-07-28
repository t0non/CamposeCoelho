import { Boxes, PackageCheck } from 'lucide-react'
import type { FullProductData } from '@/lib/data/products'

interface ProductPackagingProps {
  product: FullProductData
}

export function ProductPackaging({ product }: ProductPackagingProps) {
  const { packaging } = product.detail

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <Boxes className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-slate-900">Embalagem & Caixa Master</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-xs">
        {/* Embalagem Individual / Lote */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
            <PackageCheck className="h-4 w-4 text-navy-900" />
            <span>Embalagem da Unidade Comercial ({product.unit})</span>
          </div>
          <div className="space-y-1.5 text-slate-600">
            <p><strong>Tipo:</strong> {packaging?.type ?? 'Caixa Comercial'}</p>
            <p><strong>Unidades por {product.unit}:</strong> {packaging?.unitsPerPackage ?? product.min_quantity}</p>
            <p><strong>Dimensões:</strong> {packaging?.packageDimensions ?? 'Padrão'}</p>
            <p><strong>Peso Bruto:</strong> {packaging?.packageWeight ?? 'N/A'}</p>
          </div>
        </div>

        {/* Caixa Master Logística */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
            <Boxes className="h-4 w-4 text-orange-500" />
            <span>Caixa Master / Paletização</span>
          </div>
          <div className="space-y-1.5 text-slate-600">
            <p><strong>Unidades na Caixa Master:</strong> {packaging?.unitsPerMasterBox ?? product.multiple_quantity} un</p>
            <p><strong>Dimensões da Caixa Master:</strong> {packaging?.masterBoxDimensions ?? packaging?.boxDimensions ?? 'Padrão'}</p>
            <p><strong>Peso Total da Caixa Master:</strong> {packaging?.masterBoxWeight ?? packaging?.grossWeight ?? 'N/A'}</p>
            <p><strong>Empilhamento Máximo:</strong> {packaging?.stackabilityMax ?? '10 caixas'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
