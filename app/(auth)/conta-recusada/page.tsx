import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle, PhoneCall, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/auth/logout-button'

export const metadata: Metadata = {
  title: 'Cadastro Não Aprovado',
}

export default function ContaRecusadaPage() {
  return (
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="rounded-full bg-red-100 p-4">
        <XCircle className="h-10 w-10 text-red-600" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900">
        Cadastro Não Aprovado
      </h1>

      <p className="text-gray-600 text-sm max-w-sm">
        Não foi possível aprovar o cadastro da sua empresa no momento.
      </p>

      <div className="w-full rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-700 space-y-2 text-left">
        <p className="font-semibold text-gray-900">Deseja revisar seus dados ou esclarecer dúvidas?</p>
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="h-4 w-4 text-blue-600 shrink-0" />
          <span>comercial@atacadob2b.com.br</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <PhoneCall className="h-4 w-4 text-blue-600 shrink-0" />
          <span>(11) 4004-0000 / (11) 99999-8888</span>
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-2 w-full">
        <Link href="/catalogo">
          <Button variant="outline" fullWidth>
            Voltar ao Catálogo
          </Button>
        </Link>
        <LogoutButton />
      </div>
    </div>
  )
}
