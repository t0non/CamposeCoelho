'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { publishProductAction, unpublishProductAction } from '@/app/actions/catalog'
import { useToast } from '@/hooks/use-toast'

interface ProductPublishButtonProps {
  productId: string
  isPublished: boolean
  isActive: boolean
}

export function ProductPublishButton({ productId, isPublished, isActive }: ProductPublishButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = async () => {
    setLoading(true)
    try {
      const res = isPublished
        ? await unpublishProductAction(productId)
        : await publishProductAction(productId)
      
      if (res.success) {
        toast({ title: 'Sucesso', description: `Produto ${isPublished ? 'despublicado' : 'publicado'}.` })
      } else {
        toast({ title: 'Erro', description: res.message, variant: 'error' })
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Ocorreu um erro inesperado.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant={isPublished ? 'outline' : 'primary'} 
      onClick={handleToggle} 
      disabled={loading}
    >
      {loading ? 'Aguarde...' : isPublished ? 'Despublicar' : 'Publicar Produto'}
    </Button>
  )
}
