import { cn } from '@/lib/utils/cn'
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type IconButtonSize = 'sm' | 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  label: string
  children: ReactNode
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-slate-950',
  secondary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
  outline: 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 bg-transparent hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 text-xs rounded-md',
  md: 'h-10 w-10 text-sm rounded-lg',
  lg: 'h-12 w-12 text-base rounded-xl',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { variant = 'ghost', size = 'md', label, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'
