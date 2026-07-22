import Link from 'next/link'
import { Lock } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'
import type { PriceInfo } from '@/types/product.types'

interface ProductPriceProps {
  price?: PriceInfo
  canViewPrices: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Componente de exibição de preço.
 *
 * Regras de exibição resolvidas no servidor:
 * - canViewPrices=false → bloqueia exibição (visitante / pendente)
 * - canViewPrices=true e price=undefined → preço não cadastrado
 * - canViewPrices=true e price definido → exibe valor
 *
 * O componente NÃO tem acesso à lógica de autenticação.
 * A prop canViewPrices é sempre resolvida pelo Server Component pai.
 */
export function ProductPrice({
  price,
  canViewPrices,
  size = 'md',
}: ProductPriceProps) {
  const textSizes = {
    sm: { main: 'text-sm', secondary: 'text-xs' },
    md: { main: 'text-base', secondary: 'text-sm' },
    lg: { main: 'text-xl', secondary: 'text-sm' },
  }

  // Preço bloqueado para visitantes e pendentes
  if (!canViewPrices) {
    return (
      <Link
        href="/cadastro"
        className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 transition-colors hover:bg-gray-200"
        title="Faça cadastro para ver os preços"
      >
        <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium text-gray-500">
          Ver preço → Cadastre-se
        </span>
      </Link>
    )
  }

  // Preço não cadastrado
  if (!price) {
    return (
      <span className="text-xs text-gray-400 italic">Preço sob consulta</span>
    )
  }

  return (
    <div className="flex flex-col">
      {price.is_on_promotion && (
        <span className={`${textSizes[size].secondary} text-gray-400 line-through`}>
          {formatPrice(price.unit_price)}
        </span>
      )}
      <span
        className={`${textSizes[size].main} font-bold ${
          price.is_on_promotion ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {formatPrice(price.effective_price)}
      </span>
      {price.is_on_promotion && (
        <span className="mt-0.5 text-xs font-medium text-red-500">
          Promoção
        </span>
      )}
    </div>
  )
}
