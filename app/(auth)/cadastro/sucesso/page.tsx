import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { CheckCircle2, ShieldCheck, ArrowLeft, LogIn } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cadastro Preenchido com Sucesso | Central Atacado',
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  searchParams: Promise<{ protocol?: string }>
}

export default async function CadastroSucessoPage({ searchParams }: PageProps) {
  const { protocol } = await searchParams
  const displayProtocol = protocol || 'DEMO-2026-0001'
  const isLiveProtocol = displayProtocol.startsWith('B2B-')

  return (
    <div className="py-16 bg-slate-50 min-h-[75vh] flex items-center justify-center select-none">
      <Container className="max-w-xl text-center space-y-6">
        {/* Ícone de Sucesso Visual */}
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-green-100 text-green-600 shadow-md">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-mono font-bold text-slate-700">
            Protocolo: {displayProtocol}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 pt-1">
            Cadastro Preenchido com Sucesso!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {isLiveProtocol
              ? 'Recebemos a solicitação de cadastro empresarial. Seus dados foram enviados com sucesso para análise comercial.'
              : 'Recebemos a solicitação de cadastro empresarial no fluxo de demonstração da plataforma Central Atacado B2B.'}
          </p>
        </div>

        {/* Quadro Informativo */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5 text-left">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{isLiveProtocol ? 'Status Cadastral: Pendente de Análise' : 'Nota de Demonstração:'}</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            {isLiveProtocol
              ? 'O cadastro da sua empresa está em análise pela equipe comercial. Você receberá um e-mail assim que o acesso aos preços e compras for liberado.'
              : 'Este projeto pode operar em modo de simulação visual ou conectado ao Supabase. Ao submeter cadastros em ambiente conectado, o sistema registra os acessos automaticamente.'}
          </p>
        </div>

        {/* Próximos Passos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700 text-left space-y-2">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Resumo dos Próximos Passos:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>Análise dos documentos cadastrais (Prazo médio: 24h úteis)</li>
            <li>Notificação de aprovação enviada por e-mail e WhatsApp</li>
            <li>Liberação imediata da visualização de preços e pedidos no site</li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Loja</span>
          </Link>

          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-xs font-bold text-white hover:bg-navy-800 transition-colors shadow-md"
          >
            <LogIn className="h-4 w-4" />
            <span>Ir para o Login</span>
          </Link>
        </div>
      </Container>
    </div>
  )
}
