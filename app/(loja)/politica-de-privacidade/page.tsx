import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade e LGPD | Central Atacado',
  description: 'Tratamento de dados cadastrais e política de privacidade LGPD para empresas.',
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <Container className="max-w-4xl space-y-6">
        <div className="border-b border-slate-200 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Privacidade & LGPD</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Política de Privacidade</h1>
          <p className="text-xs text-slate-500">Última atualização: Julho de 2026</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Aviso de Demonstração Legal:</p>
            <p className="mt-0.5">
              Este documento apresenta as diretrizes de privacidade da plataforma Central Atacado. Os textos legais deverão ser validados pelo Encarregado de Proteção de Dados (DPO) antes da operação real.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Coleta e Finalidade dos Dados</h2>
            <p>
              Os dados cadastrais coletados (CNPJ, Razão Social, dados dos responsáveis e documentos empresariais) destinam-se exclusivamente à análise de crédito, verificação fiscal, segurança da operação e atendimento comercial.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Segurança das Informações</h2>
            <p>
              Adotamos criptografia SSL de 256 bits, controle de acesso estrito e buckets privados de armazenamento para proteger os documentos e dados corporativos contra acessos não autorizados.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Direitos do Titular (LGPD)</h2>
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), a empresa e seus representantes podem solicitar a confirmação, acesso, correção ou eliminação dos dados cadastrais armazenados.
            </p>
          </section>
        </div>
      </Container>
    </div>
  )
}
