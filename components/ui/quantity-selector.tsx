'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface QuantitySelectorProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  className?: string
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  unit,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (disabled) return
    const newValue = Math.max(min, value - step)
    onChange(newValue)
  }

  const handleIncrement = () => {
    if (disabled) return
    const newValue = Math.min(max, value + step)
    onChange(newValue)
  }

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="flex h-full w-8 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Diminuir quantidade"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <span className="w-10 text-center text-xs font-bold text-slate-900 select-none">
          {value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="flex h-full w-8 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Aumentar quantidade"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
    </div>
  )
}
