import Link from 'next/link'
import { Lock, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PriceBlockedProps {
  status?: 'visitor' | 'pending' | 'rejected' | 'suspended' | 'approved'
  compact?: boolean
  className?: string
}

/**
 * Componente estrito para exibição de preço bloqueado.
 * NUNCA recebe nem armazena valores numéricos de preço.
 */
export function PriceBlocked({
  status = 'visitor',
  compact = false,
  className,
}: PriceBlockedProps) {
  if (status === 'pending') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2.5 text-xs font-medium',
          className,
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span>Cadastro em análise. Os preços serão liberados após a aprovação.</span>
      </div>
    )
  }

  if (status === 'rejected' || status === 'suspended') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 text-red-800 p-2.5 text-xs font-medium',
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
        <span>Entre em contato com nosso atendimento para revisar seu cadastro.</span>
      </div>
    )
  }

  // State = visitor / unauthenticated
  if (compact) {
    return (
      <Link
        href="/cadastro"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-500 hover:text-white transition-colors',
          className,
        )}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Ver preço → Cadastre-se</span>
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center',
        className,
      )}
    >
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
        <Lock className="h-4 w-4 text-orange-500" aria-hidden="true" />
        <span>Preço exclusivo para empresas</span>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        Entre ou cadastre sua empresa para consultar os preços.
      </p>
      <div className="flex gap-2 pt-1">
        <Link
          href="/login"
          className="flex-1 rounded-lg bg-navy-900 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 text-center transition-colors"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="flex-1 rounded-lg bg-orange-500 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 text-center transition-colors"
        >
          Cadastrar
        </Link>
      </div>
    </div>
  )
}
