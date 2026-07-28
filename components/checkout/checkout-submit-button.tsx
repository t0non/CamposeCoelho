'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkoutAction } from '@/app/actions/checkout'

interface CheckoutSubmitButtonProps {
  shippingAddressId: string | null
  disabled?: boolean
}

const IDEMPOTENCY_STORAGE_KEY = 'checkout:idempotency_key'

/**
 * Obtém a idempotency key da tentativa atual, persistida em sessionStorage.
 * Sobrevive a um refresh real da página (sessionStorage não é limpo por
 * reload, só ao fechar a aba) — diferente de estado em memória (useRef),
 * que se perderia. O servidor continua sendo a autoridade de ownership
 * (profile_id/company_id); esta chave só evita duplicar o PEDIDO em
 * clique duplo/retry, nunca é usada para autorização.
 */
function getOrCreateIdempotencyKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY)
    if (existing) return existing
    const key = crypto.randomUUID()
    window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key)
    return key
  } catch {
    // sessionStorage indisponível (ex.: modo privado restrito) — cai para
    // uma chave em memória; duplo clique na mesma sessão de página ainda
    // funciona, apenas não sobrevive a um refresh real.
    return crypto.randomUUID()
  }
}

export function CheckoutSubmitButton({ shippingAddressId, disabled = false }: CheckoutSubmitButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [idempotencyKey] = useState<string>(() => getOrCreateIdempotencyKey())

  const handleClick = () => {
    if (isPending || submitted || disabled || !shippingAddressId || !idempotencyKey) return
    setError(null)
    setSubmitted(true)

    startTransition(async () => {
      const result = await checkoutAction({
        idempotency_key: idempotencyKey,
        shipping_address_id: shippingAddressId,
      })

      if (!result.success) {
        setError(result.message ?? 'Erro ao finalizar o pedido.')
        setSubmitted(false)
        return
      }

      // Pedido confirmado: a chave desta tentativa não deve ser reutilizada
      // por um checkout futuro (novo carrinho, novo pedido, nova chave).
      try {
        window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY)
      } catch {
        // ignora indisponibilidade de sessionStorage
      }

      router.push(`/checkout/sucesso/${result.order_id}`)
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="accent"
        loading={isPending}
        disabled={isPending || submitted || disabled || !shippingAddressId}
        onClick={handleClick}
        className="w-full h-12 text-sm font-bold shadow-md"
      >
        Finalizar Pedido
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
