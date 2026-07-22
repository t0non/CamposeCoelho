import { cn } from '@/lib/utils/cn'
import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { label: string; value: string | number }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent',
            error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 hover:border-slate-400',
            props.disabled && 'cursor-not-allowed bg-slate-50 opacity-60',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
