'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BannerList } from '@/components/admin/banners/banner-list'
import { BannerForm } from '@/components/admin/banners/banner-form'
import { Plus } from 'lucide-react'

type Banner = {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  mobile_image_url: string | null
  is_active: boolean
  link_url: string | null
  position: number
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined)

  const fetchBanners = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('position', { ascending: true })
      
    if (data) {
      setBanners(data as Banner[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleAddNew = () => {
    setEditingBanner(undefined)
    setShowForm(true)
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    fetchBanners() // recarrega a lista
  }

  if (isLoading && banners.length === 0) {
    return <div className="p-8 text-center text-gray-500">Carregando banners...</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1b3b6f]">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os banners da página inicial. Você pode subir imagens diferentes para PC e Celular.
          </p>
        </div>
        {!showForm && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-[#ffe000] text-[#1b3b6f] font-bold px-4 py-2 rounded-md hover:bg-[#ebd000] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Novo Banner
          </button>
        )}
      </div>

      {showForm ? (
        <BannerForm 
          initialData={editingBanner} 
          onClose={handleFormClose} 
        />
      ) : (
        <BannerList 
          banners={banners} 
          onEdit={handleEdit} 
        />
      )}
    </div>
  )
}
