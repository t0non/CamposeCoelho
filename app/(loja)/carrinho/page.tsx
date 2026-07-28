import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAuthContext } from '@/lib/supabase/auth'
import { readActiveCart } from '@/lib/data/cart'
import { Container } from '@/components/ui/container'
import { formatPrice } from '@/lib/utils/format'
import { CartPageActions } from '@/components/cart/cart-page-actions'
import { ShoppingBag, AlertTriangle, ArrowLeft, ArrowRight, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Meu Carrinho | AtacadoB2B',
  description: 'Revise os itens do seu pedido antes de finalizar.',
}

export default async function CarrinhoPage() {
  const authContext = await getAuthContext()

  // Redirecionar visitantes não autenticados
  if (!authContext.user) {
    redirect('/login?redirect=/carrinho')
  }

  const { user } = authContext
  const profileRole = user.role

  // Leitura set-based do carrinho ativo. A RPC (SECURITY DEFINER) resolve a
  // empresa: customer pelo próprio profile; seller exige contexto de empresa
  // validado (BLOCO 12B) — por isso, na loja, o alvo é null e o seller vê
  // carrinho vazio com aviso. Admin/pendente/rejeitado também retornam vazio.
  const { summary, ok } = await readActiveCart(null)
  const items = summary.items
  const readError = !ok

  const canViewPrices = authContext.canViewPrices
  const estimatedSubtotal = summary.subtotal
  const totalUnits = summary.count
  const hasUnavailable = summary.hasUnavailable

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8 max-w-5xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Meu Carrinho
              {totalUnits > 0 && (
                <span className="ml-2 text-lg font-normal text-slate-500">
                  ({totalUnits} {totalUnits === 1 ? 'item' : 'itens'})
                </span>
              )}
            </h1>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 mt-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Continuar comprando
            </Link>
          </div>
        </div>

        {/* Erro de leitura seguro (sem SQL / stack trace) */}
        {readError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">
              Não foi possível carregar seu carrinho agora. Atualize a página em instantes.
            </p>
          </div>
        )}

        {/* Aviso obrigatório */}
        {canViewPrices && items.length > 0 && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              Valores e disponibilidade serão confirmados ao finalizar o pedido.
            </p>
          </div>
        )}

        {/* Seller sem contexto de empresa */}
        {profileRole === 'seller' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-6">
            <p className="text-sm font-semibold text-blue-800">Contexto de empresa necessário</p>
            <p className="text-xs text-blue-600 mt-1">
              Para gerenciar carrinhos como Vendedor, selecione a empresa-alvo no painel do vendedor.
            </p>
          </div>
        )}

        {items.length === 0 ? (
          /* Estado vazio */
          <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 shadow-xs py-20 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300 mb-4">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Seu carrinho está vazio</h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Explore nosso catálogo de atacado e adicione produtos ao seu pedido.
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
            {/* Lista de itens */}
            <div className="lg:col-span-2 space-y-3">
              {/* Aviso itens indisponíveis */}
              {hasUnavailable && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">
                    Alguns itens estão indisponíveis. Remova-os antes de finalizar o pedido.
                  </p>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.item_id}
                  className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex gap-4 transition-opacity ${!item.is_available ? 'opacity-60' : ''}`}
                >
                  {/* Imagem */}
                  <div className="relative h-20 w-20 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        className="object-contain"
                        sizes="80px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-200">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  {/* Info + Ações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {item.product_name}
                          {item.variant_name ? ` — ${item.variant_name}` : ''}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          REF: {item.variant_sku ?? item.product_sku}
                        </p>
                        {!item.is_available && item.unavailable_reason && (
                          <p className="text-[11px] text-red-500 font-semibold mt-1">
                            ⚠ {item.unavailable_reason}
                          </p>
                        )}
                        {item.is_on_promotion && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            PROMOÇÃO
                          </span>
                        )}
                      </div>

                      {/* Preço */}
                      {canViewPrices && (
                        <div className="text-right shrink-0">
                          {item.effective_price != null ? (
                            <>
                              <p className="text-sm font-extrabold text-slate-900">
                                {formatPrice(item.line_total ?? item.effective_price * item.quantity)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {formatPrice(item.effective_price)} / {item.unit ?? 'un'}
                              </p>
                              {item.unit_price != null && item.unit_price !== item.effective_price && (
                                <p className="text-[10px] text-slate-400 line-through">
                                  {formatPrice(item.unit_price)}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-red-500 font-semibold">Sem preço</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações Client-Side (quantidade + remover) */}
                    <CartPageActions
                      itemId={item.item_id}
                      quantity={item.quantity}
                      minQuantity={item.min_quantity}
                      multipleQuantity={item.multiple_quantity}
                      unit={item.unit}
                      stockAvailable={item.stock_available}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo lateral */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sticky top-24">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Resumo do Pedido</h2>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{totalUnits} {totalUnits === 1 ? 'item' : 'itens'}</span>
                    {canViewPrices && (
                      <span className="font-semibold">{formatPrice(estimatedSubtotal)}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Frete</span>
                    <span>Calculado no checkout</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-4 pt-4">
                  {canViewPrices ? (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-900">Subtotal Estimado</span>
                        <span className="text-lg font-extrabold text-orange-600">
                          {formatPrice(estimatedSubtotal)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-4">
                        Valores e disponibilidade confirmados ao finalizar.
                      </p>
                      {/* Checkout será implementado no BLOCO 12B — botão
                          desabilitado para não criar pedido falso. */}
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Checkout disponível no BLOCO 12B"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-bold text-white opacity-50 cursor-not-allowed transition-colors shadow-md"
                      >
                        <span>Finalizar Pedido</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <p className="text-[11px] text-slate-400 text-center mt-2">
                        A finalização do pedido (checkout) será liberada em breve.
                      </p>
                      {hasUnavailable && (
                        <p className="text-[11px] text-red-500 text-center mt-2">
                          Remova os itens indisponíveis antes de finalizar.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        Faça login e tenha sua empresa aprovada para ver preços e finalizar.
                      </p>
                      <Link
                        href="/cadastro"
                        className="block w-full text-center rounded-xl bg-navy-900 px-4 py-3 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                      >
                        Cadastrar Empresa
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}
