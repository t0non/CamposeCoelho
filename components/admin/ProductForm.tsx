'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProductAction, updateProductAction } from '@/app/actions/catalog'
import { Button } from '@/components/ui/button'
import { FormSwitch } from '@/components/admin/form-switch'
import { useToast } from '@/hooks/use-toast'

interface ProductFormProps {
  initialData?: any
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
}

export function ProductForm({ initialData, categories, brands }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    category_id: initialData?.category_id || '',
    brand_id: initialData?.brand_id || '',
    unit: initialData?.unit || 'UN',
    min_quantity: initialData?.min_quantity || 1,
    multiple_quantity: initialData?.multiple_quantity || 1,
    weight_grams: initialData?.weight_grams || 0,
    short_description: initialData?.short_description || '',
    description: initialData?.description || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    is_active: initialData ? initialData.is_active : false,
    is_new_arrival: initialData ? initialData.is_new_arrival : false,
    is_featured: initialData ? initialData.is_featured : false
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSwitch = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        min_quantity: parseInt(String(formData.min_quantity), 10),
        multiple_quantity: parseInt(String(formData.multiple_quantity), 10),
        weight_grams: parseInt(String(formData.weight_grams), 10),
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
      }

      const res = initialData
        ? await updateProductAction(initialData.id, payload)
        : await createProductAction(payload)

      if (res.success) {
        toast({
          title: 'Sucesso',
          description: initialData ? 'Produto atualizado.' : 'Produto criado como rascunho.',
        })
        if (!initialData && (res as any).id) {
          router.push(`/admin/produtos/${(res as any).id}`)
        } else {
          router.refresh()
        }
      } else {
        toast({ title: 'Erro', description: res.message || 'Erro desconhecido', variant: 'error' })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Dados inválidos.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white p-6 rounded-md border space-y-4">
        <h3 className="font-medium">Informações Gerais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Nome do Produto *</label>
            <input required name="name" value={formData.name} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Slug *</label>
            <input required name="slug" value={formData.slug} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">SKU *</label>
            <input required name="sku" value={formData.sku} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Unidade</label>
            <input required name="unit" value={formData.unit} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-md border space-y-4">
        <h3 className="font-medium">Organização</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Categoria</label>
            <select name="category_id" value={formData.category_id} onChange={handleChange} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Nenhuma</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Marca</label>
            <select name="brand_id" value={formData.brand_id} onChange={handleChange} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Nenhuma</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-md border space-y-4">
        <h3 className="font-medium">Regras Comerciais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Qtd Mínima</label>
            <input required type="number" min="1" name="min_quantity" value={formData.min_quantity} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Múltiplo</label>
            <input required type="number" min="1" name="multiple_quantity" value={formData.multiple_quantity} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Peso (g)</label>
            <input required type="number" min="0" name="weight_grams" value={formData.weight_grams} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-md border space-y-4">
        <h3 className="font-medium">Conteúdo e SEO</h3>
        <div className="grid gap-4">
          <div>
            <label className="text-sm block mb-1">Descrição Curta</label>
            <textarea name="short_description" value={formData.short_description} onChange={handleChange} className="w-full flex min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Descrição Completa</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full flex min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">SEO Title</label>
            <input name="seo_title" value={formData.seo_title} onChange={handleChange} className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">SEO Description</label>
            <textarea name="seo_description" value={formData.seo_description} onChange={handleChange} className="w-full flex min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-md border space-y-4">
        <h3 className="font-medium">Configurações Adicionais</h3>
        <div className="flex flex-col gap-4">
          <FormSwitch label="Ativo" description="Aparece nas listagens (se publicado)." checked={formData.is_active} onCheckedChange={(v: boolean) => handleSwitch('is_active', v)} />
          <FormSwitch label="Novidade" description="Exibir badge de novidade." checked={formData.is_new_arrival} onCheckedChange={(v: boolean) => handleSwitch('is_new_arrival', v)} />
          <FormSwitch label="Destaque" description="Aparecer em seções de destaque." checked={formData.is_featured} onCheckedChange={(v: boolean) => handleSwitch('is_featured', v)} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Salvar Alterações' : 'Criar Produto (Rascunho)'}
        </Button>
      </div>
    </form>
  )
}
