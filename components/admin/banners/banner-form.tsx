'use client'

import { useState } from 'react'
import { saveBanner, uploadBannerImage } from '@/lib/actions/admin/banners'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

import { Banner } from '@/types/banner.types'

interface BannerFormProps {
  initialData?: Banner
  onClose: () => void
}

export function BannerForm({ initialData, onClose }: BannerFormProps) {
  const [formData, setFormData] = useState<Partial<Banner>>(
    initialData || {
      title: '',
      subtitle: '',
      image_url: '',
      mobile_image_url: '',
      is_active: true,
      link_url: '',
      position: 0
    }
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [desktopFile, setDesktopFile] = useState<File | null>(null)
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const handleDesktopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDesktopFile(e.target.files[0])
    }
  }

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMobileFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      let finalImageUrl = formData.image_url
      let finalMobileUrl = formData.mobile_image_url

      if (!finalImageUrl && !desktopFile) {
        setError('A imagem do banner (Computador) é obrigatória.')
        setIsSubmitting(false)
        return
      }

      if (desktopFile) {
        const desktopData = new FormData()
        desktopData.append('file', desktopFile)
        const res = await uploadBannerImage(desktopData)
        if (res.error) throw new Error(res.error)
        finalImageUrl = res.url!
      }

      if (mobileFile) {
        const mobileData = new FormData()
        mobileData.append('file', mobileFile)
        const res = await uploadBannerImage(mobileData)
        if (res.error) throw new Error(res.error)
        finalMobileUrl = res.url!
      }

      const res = await saveBanner({
        id: formData.id,
        title: formData.title || '',
        subtitle: formData.subtitle || null,
        image_url: finalImageUrl || '',
        mobile_image_url: finalMobileUrl || null,
        link_url: formData.link_url || null,
        is_active: formData.is_active ?? true,
        position: formData.position || 0
      })

      if (res.error) throw new Error(res.error)

      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o banner')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{initialData ? 'Editar Banner' : 'Novo Banner'}</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Upload Desktop */}
          <div>
            <label className="block text-sm font-semibold mb-2">Imagem Desktop (Computador) *</label>
            <p className="text-xs text-gray-500 mb-2">Recomendado: 1920x600 px (Paisagem)</p>
            
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-gray-50 overflow-hidden hover:bg-gray-100 transition-colors">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleDesktopChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {(desktopFile || formData.image_url) ? (
                <Image 
                  src={desktopFile ? URL.createObjectURL(desktopFile) : (formData.image_url || '')}
                  alt="Desktop Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-center text-gray-400 flex flex-col items-center">
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-xs">Clique para fazer upload</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Mobile */}
          <div>
            <label className="block text-sm font-semibold mb-2">Imagem Mobile (Celular)</label>
            <p className="text-xs text-gray-500 mb-2">Recomendado: 1080x1350 px (Vertical)</p>
            
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-gray-50 overflow-hidden hover:bg-gray-100 transition-colors">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleMobileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {(mobileFile || formData.mobile_image_url) ? (
                <Image 
                  src={mobileFile ? URL.createObjectURL(mobileFile) : (formData.mobile_image_url || '')}
                  alt="Mobile Preview"
                  fill
                  className="object-contain bg-black/5"
                />
              ) : (
                <div className="text-center text-gray-400 flex flex-col items-center">
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-xs">Clique para fazer upload</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Título Interno</label>
            <input 
              type="text" 
              required
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Ex: Campanha Dia dos Pais"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Link de Destino</label>
            <input 
              type="text" 
              value={formData.link_url || ''}
              onChange={e => setFormData({...formData, link_url: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Ex: /catalogo?cat=dia-dos-pais"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="is_active"
            checked={formData.is_active ?? true}
            onChange={e => setFormData({...formData, is_active: e.target.checked})}
            className="h-4 w-4 text-[#1b3b6f]"
          />
          <label htmlFor="is_active" className="text-sm font-semibold">
            Banner Ativo (será exibido no site)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm font-semibold hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-6 py-2 bg-[#1b3b6f] text-white rounded text-sm font-bold hover:bg-[#142d55] disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Banner'}
          </button>
        </div>
      </form>
    </div>
  )
}
