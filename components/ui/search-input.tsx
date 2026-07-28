'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  loading?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, loading = false, className, placeholder = 'Buscar por produto, SKU, código, categoria ou marca...', ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0)

    return (
      <div className="relative w-full">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
        </div>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20',
            className,
          )}
          {...props}
        />

        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  },
)

SearchInput.displayName = 'SearchInput'
