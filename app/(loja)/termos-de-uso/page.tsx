import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { FileText, ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso Comercial | Central Atacado',
  description: 'Condições gerais de uso e políticas comerciais para compras no atacado B2B.',
}

export default function TermosDeUsoPage() {
  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <Container className="max-w-4xl space-y-6">
        <div className="border-b border-slate-200 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            <span>Documento Institucional Provisório</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Termos de Uso Comercial</h1>
          <p className="text-xs text-slate-500">Última atualização: Julho de 2026</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Aviso de Demonstração Legal:</p>
            <p className="mt-0.5">
              Este documento é uma minuta demonstrativa da plataforma Central Atacado B2B. Os textos definitivos deverão ser revisados por assessoria jurídica antes da operação em produção.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Objeto e Condições B2B</h2>
            <p>
              A plataforma Central Atacado destina-se exclusivamente à comercialização de produtos no atacado para pessoas jurídicas devidamente registradas com CNPJ ativo. A visualização de preços e a realização de pedidos dependem da aprovação prévia do cadastro comercial.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Cadastro e Aprovação Comercial</h2>
            <p>
              Ao solicitar o cadastro, a empresa compromete-se a fornecer informações verdadeiras e atualizadas. A aprovação fica sujeita à análise de crédito, verificação cadastral na Receita Federal e conformidade fiscal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Pedidos Mínimos e Condições de Pagamento</h2>
            <p>
              Os pedidos estão sujeitos a valores mínimos por pedido e quantidades mínimas por lote/caixa. Condições faturadas via boleto dependem de análise e concessão de limite comercial.
            </p>
          </section>
        </div>
      </Container>
    </div>
  )
}
