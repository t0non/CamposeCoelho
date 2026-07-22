import { cn } from '@/lib/utils/cn'
import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const checkId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <label htmlFor={checkId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
        <input
          ref={ref}
          id={checkId}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-slate-300 text-orange-500 transition focus:ring-2 focus:ring-orange-500/20 cursor-pointer',
            className,
          )}
          {...props}
        />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
