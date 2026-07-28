'use client'

import { useState, useEffect } from 'react'
import { createVariantAction, updateVariantAction } from '@/app/actions/catalog'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { FormSwitch } from '@/components/admin/form-switch'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'

interface VariantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  initialData?: any
}

export function VariantFormDialog({ open, onOpenChange, productId, initialData }: VariantFormDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    min_quantity: 1,
    multiple_quantity: 1,
    is_active: true
  })
  const [attributes, setAttributes] = useState<{key: string, value: string}[]>([])

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          sku: initialData.sku || '',
          barcode: initialData.barcode || '',
          min_quantity: initialData.min_quantity || 1,
          multiple_quantity: initialData.multiple_quantity || 1,
          is_active: initialData.is_active
        })
        const attrs = Object.entries(initialData.attributes || {}).map(([k, v]) => ({ key: k, value: String(v) }))
        setAttributes(attrs)
      } else {
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          min_quantity: 1,
          multiple_quantity: 1,
          is_active: true
        })
        setAttributes([])
      }
    }
  }, [open, initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    const newAttrs = [...attributes]
    newAttrs[index][field] = val
    setAttributes(newAttrs)
  }

  const addAttribute = () => setAttributes([...attributes, { key: '', value: '' }])
  const removeAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Build attributes JSON
    const attrsObj: Record<string, string> = {}
    for (const attr of attributes) {
      if (attr.key.trim()) attrsObj[attr.key.trim()] = attr.value.trim()
    }

    try {
      const payload = {
        ...formData,
        product_id: productId, // required for new, safely ignored on update
        min_quantity: parseInt(String(formData.min_quantity), 10),
        multiple_quantity: parseInt(String(formData.multiple_quantity), 10),
        attributes: attrsObj
      }

      const res = initialData
        ? await updateVariantAction(initialData.id, payload)
        : await createVariantAction(payload)

      if (res.success) {
        toast({ title: 'Sucesso', description: `Variante ${initialData ? 'atualizada' : 'criada'}.` })
        onOpenChange(false)
      } else {
        toast({ title: 'Erro', description: res.message, variant: 'error' })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Dados inválidos.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={open} 
      onClose={() => onOpenChange(false)} 
      title={initialData ? 'Editar Variante' : 'Nova Variante'}
      maxWidth="lg"
    >
      <p className="text-sm text-slate-500 mb-4">
        {initialData ? 'Atualize as opções de variação.' : 'Adicione uma nova variação de produto.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm block mb-1">Nome (Ex: P, Azul)</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="text-sm block mb-1">SKU *</label>
              <input required name="sku" value={formData.sku} onChange={handleChange} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="text-sm block mb-1">Código de Barras</label>
              <input name="barcode" value={formData.barcode} onChange={handleChange} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="text-sm block mb-1">Qtd Mínima</label>
              <input required type="number" min="1" name="min_quantity" value={formData.min_quantity} onChange={handleChange} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="text-sm block mb-1">Múltiplo</label>
              <input required type="number" min="1" name="multiple_quantity" value={formData.multiple_quantity} onChange={handleChange} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Atributos (Opcional)</label>
              <Button type="button" variant="outline" size="sm" onClick={addAttribute} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {attributes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum atributo (Ex: "Cor": "Azul").</p>
              )}
              {attributes.map((attr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input placeholder="Chave (Ex: Tamanho)" value={attr.key} onChange={(e) => handleAttributeChange(index, 'key', e.target.value)} className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
                  <input placeholder="Valor (Ex: M)" value={attr.value} onChange={(e) => handleAttributeChange(index, 'value', e.target.value)} className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 text-destructive" onClick={() => removeAttribute(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <FormSwitch label="Ativa" checked={formData.is_active} onCheckedChange={(v: boolean) => setFormData({ ...formData, is_active: v })} />
            <div className="space-x-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Salvar</Button>
            </div>
          </div>
        </form>
    </Modal>
  )
}
