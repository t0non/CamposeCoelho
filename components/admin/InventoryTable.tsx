'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { History, Pencil } from 'lucide-react'
import { InventoryAdjustmentModal } from './InventoryAdjustmentModal'
import { InventoryHistoryModal } from './InventoryHistoryModal'
import { formatDateTime } from '@/lib/utils/format'

interface InventoryTableProps {
  data: any[]
}

export function InventoryTable({ data }: InventoryTableProps) {
  const [selectedInventory, setSelectedInventory] = useState<any>(null)
  const [historyInventory, setHistoryInventory] = useState<any>(null)

  const getStockStatus = (inv: any) => {
    if (inv.quantity_available === 0) return 'zerado'
    if (inv.quantity_available <= inv.min_stock_alert) return 'baixo'
    return 'disponivel'
  }

  const getStockStatusBadge = (inv: any) => {
    const status = getStockStatus(inv)
    switch (status) {
      case 'zerado':
        return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Zerado</span>
      case 'baixo':
        return <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Baixo Estoque</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Normal</span>
    }
  }

  return (
    <>
      <div className="bg-white border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Disponível (Físico)</TableHead>
              <TableHead className="text-right">Reservado</TableHead>
              <TableHead className="text-right">Utilizável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum registro de estoque encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((inv) => {
                const usable = inv.quantity_available - inv.quantity_reserved
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-sm">{inv.product?.name}</TableCell>
                    <TableCell className="text-sm">{inv.variant?.name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.variant?.sku || inv.product?.sku}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{inv.quantity_available}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{inv.quantity_reserved}</TableCell>
                    <TableCell className={`text-right font-bold text-sm ${usable <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {usable}
                    </TableCell>
                    <TableCell>{getStockStatusBadge(inv)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(inv.updated_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedInventory(inv)}
                        title="Ajustar Estoque"
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setHistoryInventory(inv)}
                        title="Ver Histórico de Movimentações"
                        className="h-8 w-8 p-0"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInventory && (
        <InventoryAdjustmentModal
          inventory={selectedInventory}
          open={!!selectedInventory}
          onOpenChange={(open) => !open && setSelectedInventory(null)}
        />
      )}

      {historyInventory && (
        <InventoryHistoryModal
          inventory={historyInventory}
          open={!!historyInventory}
          onOpenChange={(open) => !open && setHistoryInventory(null)}
        />
      )}
    </>
  )
}
