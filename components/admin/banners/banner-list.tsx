'use client'

import { useState } from 'react'
import { updateBannerOrder, deleteBanner } from '@/lib/actions/admin/banners'
import { ArrowUp, ArrowDown, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

import { Banner } from '@/types/banner.types'

interface BannerListProps {
  banners: Banner[]
  onEdit: (banner: Banner) => void
}

export function BannerList({ banners, onEdit }: BannerListProps) {
  const [localBanners, setLocalBanners] = useState(banners)
  const [isUpdating, setIsUpdating] = useState(false)

  const moveUp = async (index: number) => {
    if (index === 0) return
    const newBanners = [...localBanners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[index - 1]
    newBanners[index - 1] = temp
    setLocalBanners(newBanners)
    await saveOrder(newBanners)
  }

  const moveDown = async (index: number) => {
    if (index === localBanners.length - 1) return
    const newBanners = [...localBanners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[index + 1]
    newBanners[index + 1] = temp
    setLocalBanners(newBanners)
    await saveOrder(newBanners)
  }

  const saveOrder = async (orderedBanners: Banner[]) => {
    setIsUpdating(true)
    await updateBannerOrder(orderedBanners.map(b => b.id))
    setIsUpdating(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      setIsUpdating(true)
      await deleteBanner(id)
      setIsUpdating(false)
    }
  }

  if (localBanners.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        Nenhum banner cadastrado. Clique em "Novo Banner" para adicionar.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localBanners.map((banner, index) => (
        <div key={banner.id} className={`flex items-center gap-4 bg-white border rounded-lg p-4 shadow-sm ${!banner.is_active ? 'opacity-60' : ''}`}>
          {/* Ordenação */}
          <div className="flex flex-col gap-1">
            <button 
              disabled={index === 0 || isUpdating}
              onClick={() => moveUp(index)}
              className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button 
              disabled={index === localBanners.length - 1 || isUpdating}
              onClick={() => moveDown(index)}
              className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          </div>

          {/* Imagem (Preview Desktop) */}
          <div className="relative w-48 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
            {banner.image_url ? (
              <Image src={banner.image_url} alt={banner.title} fill className="object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-gray-300" />
            )}
          </div>
          
          {/* Imagem (Preview Mobile) */}
          <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-dashed border-gray-300" title="Banner Mobile">
            {banner.mobile_image_url ? (
              <Image src={banner.mobile_image_url} alt={banner.title} fill className="object-cover" />
            ) : (
              <span className="text-[10px] text-gray-400 text-center">Sem mobile</span>
            )}
          </div>

          {/* Dados */}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm">{banner.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {banner.is_active ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit(banner)}
              disabled={isUpdating}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Editar"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleDelete(banner.id)}
              disabled={isUpdating}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Excluir"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
