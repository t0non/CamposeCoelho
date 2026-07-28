import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  variant?: 'light' | 'dark'
  className?: string
}

export function Logo({ variant = 'dark', className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 font-bold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-1 py-0.5',
        className,
      )}
      aria-label="Central Atacado - Ir para a página inicial"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shrink-0">
        <Building2 className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'text-xl font-extrabold tracking-tight',
            variant === 'light' ? 'text-white' : 'text-slate-900',
          )}
        >
          Central<span className="text-orange-500">Atacado</span>
        </span>
        <span
          className={cn(
            'text-[10px] font-medium tracking-wider uppercase mt-0.5',
            variant === 'light' ? 'text-slate-300' : 'text-slate-500',
          )}
        >
          Atacado B2B
        </span>
      </div>
    </Link>
  )
}
