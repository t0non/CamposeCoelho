'use client'

import Link from 'next/link'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function ProductError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="py-16 bg-slate-50 min-h-[60vh] flex items-center justify-center">
      <Container className="max-w-md text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Ops! Ocorreu um erro ao carregar o produto</h1>
          <p className="text-xs text-slate-500">
            Não foi possível carregar as informações deste produto no momento. Tente novamente em instantes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" onClick={() => reset()} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar Novamente
          </Button>

          <Link
            href="/catalogo"
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Catálogo
          </Link>
        </div>
      </Container>
    </div>
  )
}
