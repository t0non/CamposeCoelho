'use client'

import { useState } from 'react'
import { Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { VariantFormDialog } from './VariantFormDialog'
import { toggleVariantStatusAction } from '@/app/actions/catalog'
import { ConfirmStatusDialog } from '@/components/admin/confirm-status-dialog'
import { useToast } from '@/hooks/use-toast'

interface ProductVariantsSectionProps {
  productId: string
  variants: any[]
}

export function ProductVariantsSection({ productId, variants }: ProductVariantsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: any | null }>({
    open: false,
    variant: null,
  })
  const { toast } = useToast()

  const handleToggleStatus = async () => {
    if (!statusDialog.variant) return
    const newState = !statusDialog.variant.is_active
    const res = await toggleVariantStatusAction(statusDialog.variant.id, newState)
    if (res.success) {
      toast({ title: 'Sucesso', description: `Variante ${newState ? 'ativada' : 'desativada'} com sucesso.` })
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'error' })
    }
    setStatusDialog({ open: false, variant: null })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 border rounded-t-md">
        <div>
          <h3 className="font-medium text-lg">Variantes do Produto</h3>
          <p className="text-sm text-muted-foreground">Gerencie as opções (ex: tamanho, cor) e seus respectivos SKUs.</p>
        </div>
        <Button onClick={() => { setSelectedVariant(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Variante
        </Button>
      </div>

      <div className="bg-white border rounded-b-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Barcode</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Atributos</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma variante cadastrada.</TableCell>
              </TableRow>
            ) : (
              variants.map(v => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.sku}</div>
                    {v.barcode && <div className="text-xs text-muted-foreground">{v.barcode}</div>}
                  </TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(v.attributes || {}).map(([k, val]: any) => (
                        <span key={k} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border">
                          {k}: {val}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">Disp: {v.inventories?.[0]?.quantity_available || 0}</div>
                    <div className="text-xs text-muted-foreground">Res: {v.inventories?.[0]?.quantity_reserved || 0}</div>
                  </TableCell>
                  <TableCell>
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600 text-xs font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <XCircle className="w-3 h-3" /> Inativa
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedVariant(v); setDialogOpen(true) }}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStatusDialog({ open: true, variant: v })}>
                      {v.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VariantFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        productId={productId} 
        initialData={selectedVariant} 
      />

      <ConfirmStatusDialog
        isOpen={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, variant: null })}
        title={statusDialog.variant?.is_active ? 'Desativar Variante?' : 'Ativar Variante?'}
        description={statusDialog.variant?.is_active 
          ? 'Ela deixará de ser exibida no catálogo.' 
          : 'Ela voltará a ser exibida.'}
        confirmLabel={statusDialog.variant?.is_active ? 'Desativar' : 'Ativar'}
        onConfirm={handleToggleStatus}
      />
    </div>
  )
}
