import type { ReactNode } from 'react'
import Link from 'next/link'
import { PackageOpen, SearchX, ShoppingCart } from 'lucide-react'

type EmptyStatePreset = 'products' | 'orders' | 'cart' | 'search' | 'generic'

interface EmptyStateProps {
  preset?: EmptyStatePreset
  title?: string
  description?: string
  action?: ReactNode
  actionLabel?: string
  actionHref?: string
}

const presets: Record<
  EmptyStatePreset,
  { icon: ReactNode; title: string; description: string }
> = {
  products: {
    icon: <PackageOpen className="h-12 w-12 text-slate-300" />,
    title: 'Nenhum produto encontrado',
    description: 'Tente ajustar os filtros ou pesquisar por outro termo.',
  },
  orders: {
    icon: <PackageOpen className="h-12 w-12 text-slate-300" />,
    title: 'Nenhum pedido encontrado',
    description: 'Você ainda não realizou nenhum pedido.',
  },
  cart: {
    icon: <ShoppingCart className="h-12 w-12 text-slate-300" />,
    title: 'Carrinho vazio',
    description: 'Adicione produtos ao carrinho para continuar.',
  },
  search: {
    icon: <SearchX className="h-12 w-12 text-slate-300" />,
    title: 'Nenhum resultado',
    description: 'Nenhum item correspondeu à sua pesquisa.',
  },
  generic: {
    icon: <PackageOpen className="h-12 w-12 text-slate-300" />,
    title: 'Nada por aqui',
    description: 'Não há itens para exibir no momento.',
  },
}

export function EmptyState({
  preset = 'generic',
  title,
  description,
  action,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const config = presets[preset]

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-2xl bg-white border border-slate-200">
      {config.icon}
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-800">
          {title ?? config.title}
        </p>
        <p className="text-sm text-slate-500 max-w-md">{description ?? config.description}</p>
      </div>

      {action && <div>{action}</div>}

      {!action && actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
