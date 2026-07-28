'use client'

import { useState, useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Power, PowerOff } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { upsertPriceEntryAction, togglePriceEntryStatusAction } from '@/app/actions/pricing'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDateTime } from '@/lib/utils/format'

interface PriceEntriesTableProps {
  priceTableId: string
  variants: any[]
}

export function PriceEntriesTable({ priceTableId, variants }: PriceEntriesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingPrice, setEditingPrice] = useState<{ variant: any; priceEntry?: any } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Edit fields
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [promotionalPrice, setPromotionalPrice] = useState<string>('')
  const [minQuantity, setMinQuantity] = useState<number>(1)
  const [promoStarts, setPromoStarts] = useState<string>('')
  const [promoEnds, setPromoEnds] = useState<string>('')

  const formatDatetimeLocal = (isoString?: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openEditModal = (variant: any, priceEntry?: any) => {
    setError(null)
    setEditingPrice({ variant, priceEntry })
    if (priceEntry) {
      setUnitPrice(priceEntry.unit_price.toString().replace('.', ','))
      setPromotionalPrice(priceEntry.promotional_price ? priceEntry.promotional_price.toString().replace('.', ',') : '')
      setMinQuantity(priceEntry.min_quantity)
      setPromoStarts(formatDatetimeLocal(priceEntry.promotion_starts_at))
      setPromoEnds(formatDatetimeLocal(priceEntry.promotion_ends_at))
    } else {
      setUnitPrice('')
      setPromotionalPrice('')
      setMinQuantity(1)
      setPromoStarts('')
      setPromoEnds('')
    }
  }

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!unitPrice.trim()) {
      setError('Preço unitário é obrigatório.')
      return
    }

    startTransition(async () => {
      const payload = {
        price_table_id: priceTableId,
        product_id: editingPrice?.variant.product_id,
        variant_id: editingPrice?.variant.id,
        unit_price: unitPrice.trim(),
        promotional_price: promotionalPrice.trim() || null,
        promotion_starts_at: promoStarts ? new Date(promoStarts).toISOString() : null,
        promotion_ends_at: promoEnds ? new Date(promoEnds).toISOString() : null,
        min_quantity: minQuantity,
      }

      const res = await upsertPriceEntryAction(payload)
      if (res.success) {
        setEditingPrice(null)
        router.refresh()
      } else {
        setError(res.message || 'Erro ao gravar preço.')
      }
    })
  }

  const handleToggleStatus = (priceId: string, currentActive: boolean) => {
    startTransition(async () => {
      const res = await togglePriceEntryStatusAction(priceId, !currentActive)
      if (res.success) {
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="bg-white border rounded-md overflow-x-auto text-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qtd Mínima</TableHead>
              <TableHead className="text-right">Preço Unitário</TableHead>
              <TableHead className="text-right">Preço Promo</TableHead>
              <TableHead>Vigência Promoção</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum produto/variante encontrado.
                </TableCell>
              </TableRow>
            ) : (
              variants.map((v) => {
                const hasPrices = v.prices && v.prices.length > 0
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-sm">{v.product?.name}</TableCell>
                    <TableCell className="text-sm">{v.name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                    <TableCell className="text-right text-sm">
                      {hasPrices ? v.prices.map((p: any) => <div key={p.id}>{p.min_quantity} un+</div>) : '1 un+'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {hasPrices ? v.prices.map((p: any) => <div key={p.id} className="font-medium">{formatPrice(p.unit_price)}</div>) : <span className="text-red-500 text-xs font-semibold">Valor indisponível</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-700">
                      {hasPrices ? v.prices.map((p: any) => <div key={p.id}>{p.promotional_price ? formatPrice(p.promotional_price) : '—'}</div>) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {hasPrices ? v.prices.map((p: any) => (
                        <div key={p.id}>
                          {p.promotion_starts_at || p.promotion_ends_at ? (
                            <span>
                              {p.promotion_starts_at ? formatDateTime(p.promotion_starts_at) : '—'} até{' '}
                              {p.promotion_ends_at ? formatDateTime(p.promotion_ends_at) : '—'}
                            </span>
                          ) : '—'}
                        </div>
                      )) : '—'}
                    </TableCell>
                    <TableCell>
                      {hasPrices ? v.prices.map((p: any) => (
                        <div key={p.id} className="py-0.5">
                          {p.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Ativo</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Inativo</span>
                          )}
                        </div>
                      )) : '—'}
                    </TableCell>
                    <TableCell className="text-right space-y-1">
                      {hasPrices ? (
                        v.prices.map((p: any) => (
                          <div key={p.id} className="flex justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Editar Preço"
                              onClick={() => openEditModal(v, p)}
                              disabled={isPending}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title={p.is_active ? 'Desativar Preço' : 'Ativar Preço'}
                              onClick={() => handleToggleStatus(p.id, p.is_active)}
                              disabled={isPending}
                            >
                              {p.is_active ? <PowerOff className="h-3 w-3 text-red-600" /> : <Power className="h-3 w-3 text-green-700" />}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEditModal(v)}
                          disabled={isPending}
                        >
                          Definir Preço
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingPrice && (
        <Modal
          isOpen={!!editingPrice}
          onClose={() => !isPending && setEditingPrice(null)}
          title={editingPrice.priceEntry ? 'Editar Preço' : 'Definir Novo Preço'}
        >
          <form onSubmit={handleSavePrice} className="space-y-4 pt-4 text-slate-800">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Produto / Variante</label>
              <div className="p-3 bg-slate-50 border rounded-md text-sm">
                <span className="font-bold">{editingPrice.variant?.product?.name}</span>
                {editingPrice.variant?.name && <span className="text-muted-foreground block text-xs">Variante: {editingPrice.variant.name}</span>}
                <span className="font-mono text-xs text-muted-foreground block">SKU: {editingPrice.variant?.sku}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Preço Normal *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400">R$</span>
                  <input
                    type="text"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="12,50"
                    disabled={isPending}
                    className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Qtd Mínima Atacado *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                  disabled={isPending || !!editingPrice.priceEntry}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:bg-slate-100 disabled:opacity-75"
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Preço Promocional (Opcional)</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Preço Promo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-slate-400">R$</span>
                    <input
                      type="text"
                      value={promotionalPrice}
                      onChange={(e) => setPromotionalPrice(e.target.value)}
                      placeholder="9,90"
                      disabled={isPending}
                      className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Início Promoção</label>
                    <input
                      type="datetime-local"
                      value={promoStarts}
                      onChange={(e) => setPromoStarts(e.target.value)}
                      disabled={isPending}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Fim Promoção</label>
                    <input
                      type="datetime-local"
                      value={promoEnds}
                      onChange={(e) => setPromoEnds(e.target.value)}
                      disabled={isPending}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="text-red-600 text-xs font-medium p-2 bg-red-50 border border-red-200 rounded">{error}</div>}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="secondary" onClick={() => setEditingPrice(null)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? 'Gravando...' : 'Salvar Preço'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
