import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAuthContext } from '@/lib/supabase/auth'
import { readActiveCart } from '@/lib/data/cart'
import { getCheckoutAddresses } from '@/lib/data/checkout'
import { Container } from '@/components/ui/container'
import { formatPrice } from '@/lib/utils/format'
import { CheckoutSubmitButton } from '@/components/checkout/checkout-submit-button'
import { ShoppingBag, MapPin, AlertTriangle, ArrowLeft, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finalizar Pedido' }

export default async function CheckoutPage() {
  const authContext = await getAuthContext()

  if (!authContext.user) {
    redirect('/login?redirect=/checkout')
  }

  const { user } = authContext

  // Checkout de vendedor (por empresa) não faz parte deste bloco — a
  // interface completa do seller fica para a Etapa 14.
  if (user.role === 'seller' || user.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Container className="py-16 max-w-2xl text-center">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Checkout indisponível para este perfil</h1>
            <p className="text-sm text-slate-500">
              A finalização de pedidos por vendedor/administrador será disponibilizada em uma etapa futura.
            </p>
          </div>
        </Container>
      </div>
    )
  }

  const { summary, ok } = await readActiveCart(null)
  const items = summary.items
  const addresses = authContext.company?.id ? await getCheckoutAddresses(authContext.company.id) : []
  const selectedAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null

  const canCheckout = ok && items.length > 0 && !summary.hasUnavailable && Boolean(selectedAddress)

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Finalizar Pedido</h1>
            <Link
              href="/carrinho"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 mt-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao carrinho
            </Link>
          </div>
        </div>

        {!ok && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">
              Não foi possível carregar seu carrinho agora. Atualize a página em instantes.
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 shadow-xs py-20 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300 mb-4">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Seu carrinho está vazio</h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Adicione produtos ao seu pedido antes de finalizar a compra.
            </p>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              Explorar Produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Endereço de entrega */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  Endereço de Entrega
                </h2>
                {selectedAddress ? (
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p className="font-semibold text-slate-800">{selectedAddress.label}</p>
                    <p>
                      {selectedAddress.street}, {selectedAddress.number}
                      {selectedAddress.complement ? ` — ${selectedAddress.complement}` : ''}
                    </p>
                    <p>{selectedAddress.neighborhood}, {selectedAddress.city} - {selectedAddress.state}</p>
                    <p>CEP: {selectedAddress.zip_code}</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Nenhum endereço cadastrado. Cadastre um endereço para finalizar o pedido.
                    </p>
                  </div>
                )}
              </div>

              {/* Aviso de itens indisponíveis */}
              {summary.hasUnavailable && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">
                    Alguns itens do seu carrinho estão indisponíveis. Volte ao carrinho e remova-os para continuar.
                  </p>
                </div>
              )}

              {/* Itens */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Itens do Pedido</h2>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.item_id} className="py-3 flex gap-3">
                      <div className="relative h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.product_name} fill className="object-contain" sizes="56px" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {item.product_name}
                          {item.variant_name ? ` — ${item.variant_name}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          REF: {item.variant_sku ?? item.product_sku} · Qtd: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-slate-900">
                          {formatPrice(item.line_total ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sticky top-24 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Resumo do Pedido</h2>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPrice(summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto</span>
                    <span className="font-semibold">{formatPrice(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Frete</span>
                    <span>A calcular</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900">Total</span>
                  <span className="text-lg font-extrabold text-orange-600">{formatPrice(summary.subtotal)}</span>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-medium">
                    Preços e disponibilidade são revalidados no momento da confirmação do pedido.
                  </p>
                </div>

                <CheckoutSubmitButton
                  shippingAddressId={selectedAddress?.id ?? null}
                  disabled={!canCheckout}
                />
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}
