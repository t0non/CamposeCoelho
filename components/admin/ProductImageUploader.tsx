'use client'

import { useState } from 'react'
import { UploadCloud, FileImage, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface ProductImageUploaderProps {
  productId: string
}

export function ProductImageUploader({ productId }: ProductImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0) // Simulação de progresso para UX
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 5 * 1024 * 1024) {
        toast({ title: 'Erro', description: 'O arquivo excede o limite de 5MB.', variant: 'error' })
        return
      }
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)

      setProgress(40)
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: formData,
      })

      setProgress(80)
      const json = await res.json()

      if (res.ok && json.success) {
        toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso.' })
        handleClear()
        router.refresh()
      } else {
        toast({ title: 'Erro de Upload', description: json.message || 'Erro desconhecido', variant: 'error' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha na requisição.', variant: 'error' })
    } finally {
      setProgress(100)
      setTimeout(() => setUploading(false), 500)
    }
  }

  return (
    <div className="bg-white p-4 border rounded-md">
      <h3 className="font-medium text-lg mb-4">Adicionar Nova Imagem</h3>
      
      {!file ? (
        <div className="border-2 border-dashed rounded-md p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
          <UploadCloud className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-sm text-slate-600 mb-2">
            Arraste uma imagem ou clique para selecionar.
          </p>
          <p className="text-xs text-slate-400 mb-4">
            JPEG, PNG ou WEBP até 5MB.
          </p>
          <div className="relative">
            <Button variant="outline" size="sm">Selecionar Arquivo</Button>
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 items-start p-4 border rounded-md">
            <div className="w-24 h-24 relative rounded overflow-hidden bg-slate-100 flex-shrink-0">
              <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={handleClear} disabled={uploading}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              
              {uploading && (
                <div className="mt-4 space-y-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 text-right">Enviando...</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClear} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Iniciar Upload'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
