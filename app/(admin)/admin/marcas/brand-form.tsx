'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrandAction, updateBrandAction } from '@/app/actions/catalog'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/admin/submit-button'
import { Switch } from '@/components/ui/switch'
import { ImageIcon } from 'lucide-react'

interface BrandFormProps {
  initialData?: {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    is_active: boolean
    seo_title: string | null
    seo_description: string | null
  }
}

export function BrandForm({ initialData }: BrandFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [autoSlug, setAutoSlug] = useState(!initialData)
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? '')
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)
  const [imageError, setImageError] = useState(false)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (autoSlug) {
      setSlug(
        val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value)
    setAutoSlug(false)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value)
    setImageError(false)
  }

  const action = async (formData: FormData) => {
    setError(null)
    
    const submittedLogo = formData.get('logo_url') as string
    if (submittedLogo && !submittedLogo.startsWith('http')) {
      setError('A URL do logo deve ser uma URL segura começando com http ou https.')
      return
    }

    const data = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      description: formData.get('description') || null,
      logo_url: submittedLogo || null,
      is_active: isActive,
      seo_title: formData.get('seo_title') || null,
      seo_description: formData.get('seo_description') || null,
    }

    const result = initialData
      ? await updateBrandAction(initialData.id, data)
      : await createBrandAction(data)

    if (!result.success) {
      setError(result.message || 'Erro desconhecido')
      return
    }

    router.push('/admin/marcas')
    router.refresh()
  }

  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
          label="Nome da Marca" 
          name="name" 
          value={name} 
          onChange={handleNameChange} 
          required 
          maxLength={100}
        />
        <Input 
          label="Slug" 
          name="slug" 
          value={slug} 
          onChange={handleSlugChange} 
          required 
          maxLength={150}
          pattern="^[a-z0-9-]+$"
          title="Apenas letras minúsculas, números e hifens"
          hint="URL amigável da marca"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Input 
          label="URL do Logo" 
          name="logo_url" 
          type="url"
          value={logoUrl}
          onChange={handleLogoChange}
          placeholder="https://exemplo.com/logo.png"
          hint="Insira o link direto para a imagem do logo"
        />
        
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Preview</span>
          <div className="h-16 w-32 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
            {logoUrl && !imageError ? (
              <img 
                src={logoUrl} 
                alt="Preview do logo" 
                className="max-h-full max-w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <ImageIcon className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Sem logo</span>
              </div>
            )}
          </div>
          {imageError && (
            <span className="text-xs text-red-500 mt-1">Erro ao carregar a imagem da URL informada.</span>
          )}
        </div>
      </div>

      <Input 
        label="Descrição" 
        name="description" 
        defaultValue={initialData?.description || ''} 
        maxLength={500}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">Status</label>
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onChange={setIsActive} />
          <span className="text-sm text-gray-600">{isActive ? 'Ativa' : 'Inativa'}</span>
        </div>
      </div>

      <fieldset className="border border-gray-200 rounded p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">SEO (Opcional)</legend>
        <Input 
          label="Título SEO" 
          name="seo_title" 
          defaultValue={initialData?.seo_title || ''} 
          maxLength={60}
        />
        <Input 
          label="Descrição SEO" 
          name="seo_description" 
          defaultValue={initialData?.seo_description || ''} 
          maxLength={160}
        />
      </fieldset>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton label={initialData ? 'Salvar Alterações' : 'Criar Marca'} />
      </div>
    </form>
  )
}
