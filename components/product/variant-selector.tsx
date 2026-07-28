'use client'

import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface VariantOption {
  id: string
  sku: string
  name: string
  attributes: Record<string, string>
  availableStock: number
}

interface VariantSelectorProps {
  variants: VariantOption[]
  selectedVariantId: string | null
  onSelect: (variantId: string) => void
  /** false quando há apenas 1 variante (auto-selecionada, não clicável). */
  interactive: boolean
  isPending?: boolean
}

function variantLabel(v: VariantOption): string {
  const attrs = Object.values(v.attributes ?? {}).filter(Boolean)
  return attrs.length > 0 ? attrs.join(' / ') : v.name
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
  interactive,
  isPending = false,
}: VariantSelectorProps) {
  if (variants.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">
          {interactive ? 'Selecione uma opção:' : 'Opção:'}
        </span>
        {interactive && !selectedVariantId && (
          <span className="text-[11px] font-semibold text-orange-600">Obrigatório</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role={interactive ? 'radiogroup' : undefined}>
        {variants.map((v) => {
          const isSelected = v.id === selectedVariantId
          const outOfStock = v.availableStock <= 0

          if (!interactive) {
            // Única variante ativa: indicador não-clicável, apenas informativo.
            return (
              <div
                key={v.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{variantLabel(v)}</span>
                <span className="text-[10px] font-semibold text-orange-500">REF: {v.sku}</span>
              </div>
            )
          }

          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isPending}
              onClick={() => onSelect(v.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-wait',
                isSelected
                  ? 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500 ring-offset-1'
                  : 'border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50',
              )}
            >
              {isSelected && isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSelected ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              <span>{variantLabel(v)}</span>
              <span className={cn('text-[10px] font-semibold', isSelected ? 'text-orange-500' : 'text-slate-400')}>
                REF: {v.sku}
              </span>
              {outOfStock && (
                <span className="text-[10px] font-semibold text-red-500">Sem estoque</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
