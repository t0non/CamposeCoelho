'use client'

import { useState } from 'react'
import { Trash2, Star, GripVertical, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { updateImageAltTextAction, removeProductImageAction, setPrimaryImageAction, reorderProductImagesAction } from '@/app/actions/product-images'
import Image from 'next/image'

interface ProductImageGalleryProps {
  productId: string
  images: any[]
}

export function ProductImageGallery({ productId, images }: ProductImageGalleryProps) {
  const { toast } = useToast()
  const [altTextEdit, setAltTextEdit] = useState<{ id: string, val: string } | null>(null)
  
  // Storage public URL builder
  const getImageUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
  }

  const handleAltTextSave = async (id: string) => {
    if (!altTextEdit) return
    const res = await updateImageAltTextAction({ product_id: productId, image_id: id, alt_text: altTextEdit.val })
    if (res.success) {
      toast({ title: 'Sucesso', description: 'Alt Text atualizado.' })
      setAltTextEdit(null)
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
  }

  const handleSetPrimary = async (id: string) => {
    const res = await setPrimaryImageAction(productId, id)
    if (res.success) {
      toast({ title: 'Sucesso', description: 'Imagem definida como principal.' })
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta imagem? Ação irreversível.')) return
    const res = await removeProductImageAction(productId, id)
    if (res.success) {
      toast({ title: 'Sucesso', description: 'Imagem removida com sucesso.' })
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newOrder = [...images]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    const ids = newOrder.map(img => img.id)
    const res = await reorderProductImagesAction(productId, ids)
    if (res.success) {
      toast({ title: 'Reordenado', description: 'Ordem das imagens atualizada.' })
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === images.length - 1) return
    const newOrder = [...images]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    const ids = newOrder.map(img => img.id)
    const res = await reorderProductImagesAction(productId, ids)
    if (res.success) {
      toast({ title: 'Reordenado', description: 'Ordem das imagens atualizada.' })
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 border rounded-md text-muted-foreground text-sm">
        Nenhuma imagem enviada para este produto.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((img, index) => (
        <div key={img.id} className={`border rounded-md overflow-hidden bg-white ${img.is_primary ? 'ring-2 ring-primary' : ''}`}>
          <div className="relative aspect-square bg-slate-100 flex items-center justify-center">
            <Image src={getImageUrl(img.url)} alt={img.alt_text || 'Imagem do produto'} fill className="object-cover" />
            {img.is_primary && (
              <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Principal
              </div>
            )}
          </div>
          
          <div className="p-3 space-y-3">
            {altTextEdit?.id === img.id ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={altTextEdit?.val || ''} 
                  onChange={(e) => setAltTextEdit(prev => prev ? { ...prev, val: e.target.value } : null)} 
                  className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs" 
                  placeholder="Alt text"
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleAltTextSave(img.id)}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => setAltTextEdit({ id: img.id, val: img.alt_text || '' })}>
                <p className="text-xs text-muted-foreground truncate flex-1" title={img.alt_text || 'Sem Alt Text'}>
                  {img.alt_text || 'Adicionar Alt Text'}
                </p>
                <Button size="sm" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px]">Edit</span>
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 text-slate-400" disabled={index === 0} onClick={() => handleMoveUp(index)} title="Mover p/ Esquerda">
                  <span className="text-xs">←</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 text-slate-400" disabled={index === images.length - 1} onClick={() => handleMoveDown(index)} title="Mover p/ Direita">
                  <span className="text-xs">→</span>
                </Button>
              </div>

              <div className="flex gap-1">
                {!img.is_primary && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 text-amber-500" onClick={() => handleSetPrimary(img.id)} title="Tornar Principal">
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 text-destructive" onClick={() => handleRemove(img.id)} title="Excluir Imagem">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
