import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ShoppingBag, MapPin } from 'lucide-react'
import { getAuthContext } from '@/lib/supabase/auth'
import { getOrderById } from '@/lib/supabase/queries/orders'
import { Container } from '@/components/ui/container'
import { formatPrice } from '@/lib/utils/format'
import type { CheckoutOrderSummary } from '@/lib/types/checkout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Pedido Confirmado' }

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { orderId } = await params
  const authContext = await getAuthContext()

  if (!authContext.user) {
    redirect(`/login?redirect=/checkout/sucesso/${orderId}`)
  }

  // getOrderById já filtra por profile_id = usuário autenticado (RLS +
  // filtro explícito) — nunca expõe pedido de outro cliente.
  const order = (await getOrderById(orderId)) as unknown as CheckoutOrderSummary | null

  if (!order) {
    notFound()
  }

  const address = order.shipping_address_snapshot

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-12 max-w-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pedido Confirmado!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Número do pedido: <strong className="text-slate-800">{order.order_number}</strong>
          </p>
        </div>

        {address && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              Endereço de Entrega
            </h2>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-800">{address.label}</p>
              <p>
                {address.street}, {address.number}
                {address.complement ? ` — ${address.complement}` : ''}
              </p>
              <p>{address.neighborhood}, {address.city} - {address.state}</p>
              <p>CEP: {address.zip_code}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Itens do Pedido</h2>
          <div className="divide-y divide-slate-100">
            {(order.order_items ?? []).map((item) => (
              <div key={item.id} className="py-3 flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-300 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {item.product_name}
                    {item.variant_name ? ` — ${item.variant_name}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    REF: {item.variant_sku ?? item.product_sku} · Qtd: {item.quantity}
                    {item.promotional_price != null && (
                      <span className="ml-1 text-green-600 font-semibold">· Promoção aplicada</span>
                    )}
                  </p>
                </div>
                <p className="text-xs font-extrabold text-slate-900 shrink-0">
                  {formatPrice(item.total_price)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Desconto</span>
            <span className="font-semibold">{formatPrice(order.discount)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Frete</span>
            <span className="font-semibold">{formatPrice(order.shipping_cost)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-lg font-extrabold text-orange-600">{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md"
          >
            Continuar Comprando
          </Link>
        </div>
      </Container>
    </div>
  )
}
