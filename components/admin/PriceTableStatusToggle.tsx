'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { togglePriceTableStatusAction } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'

interface PriceTableStatusToggleProps {
  id: string
  isActive: boolean
}

export function PriceTableStatusToggle({ id, isActive }: PriceTableStatusToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const res = await togglePriceTableStatusAction(id, !isActive)
      if (res.success) {
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant={isActive ? 'outline' : 'primary'}
      onClick={handleToggle}
      disabled={isPending}
      className="text-xs"
    >
      {isPending ? 'Aguarde...' : isActive ? 'Desativar Tabela' : 'Reativar Tabela'}
    </Button>
  )
}
