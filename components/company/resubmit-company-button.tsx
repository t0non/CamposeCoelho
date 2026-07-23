'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resubmitCompanyAction } from '@/app/actions/company'

export function ResubmitCompanyButton() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const handleResubmit = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      await resubmitCompanyAction()
      router.refresh()
      router.push('/conta-pendente')
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao reenviar cadastro.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}
      <Button
        type="button"
        variant="danger"
        onClick={handleResubmit}
        loading={loading}
        className="bg-red-600 hover:bg-red-700 text-white font-bold"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reenviar Cadastro para Nova Análise
      </Button>
    </div>
  )
}
