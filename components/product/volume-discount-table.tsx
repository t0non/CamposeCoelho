import { formatPrice } from '@/lib/utils/format'
import type { VolumeDiscountTier } from '@/lib/mocks/mock-volume-discounts'

interface VolumeDiscountTableProps {
  tiers: VolumeDiscountTier[]
  currentQuantity: number
  unit: string
}

export function VolumeDiscountTable({ tiers, currentQuantity, unit }: VolumeDiscountTableProps) {
  if (!tiers || tiers.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 select-none">
      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        Tabela de Descontos por Lote ({unit}):
      </p>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {tiers.map((tier, idx) => {
          const isQtyInTier =
            currentQuantity >= tier.minQuantity &&
            (tier.maxQuantity === undefined || currentQuantity <= tier.maxQuantity)

          const qtyLabel = tier.maxQuantity
            ? `${tier.minQuantity} a ${tier.maxQuantity} ${unit}s`
            : `${tier.minQuantity}+ ${unit}s`

          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                isQtyInTier
                  ? 'border-orange-500 bg-orange-50/80 ring-1 ring-orange-500 font-bold text-orange-950 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <span className="text-[10px] text-slate-500">{qtyLabel}</span>
              <span className="text-xs font-extrabold text-slate-900 mt-0.5">
                {formatPrice(tier.pricePerUnit)}
              </span>
              {tier.discountPercentage > 0 && (
                <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.2 rounded mt-0.5">
                  -{tier.discountPercentage}% OFF
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
