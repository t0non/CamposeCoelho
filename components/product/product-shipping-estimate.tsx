'use client'

import { useState } from 'react'
import { Truck, Calculator, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProductShippingEstimate() {
  const [cep, setCep] = useState('')
  const [estimated, setEstimated] = useState(false)

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    if (cep.length >= 8) {
      setEstimated(true)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 select-none">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
        <Truck className="h-4 w-4 text-orange-500" />
        <span>Simulador de Frete e Prazo Comercial</span>
      </div>

      <form onSubmit={handleCalculate} className="flex gap-2">
        <input
          type="text"
          placeholder="Digite seu CEP (00000-000)"
          value={cep}
          onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
        />
        <Button type="submit" variant="outline" className="px-4 text-xs font-bold">
          Calcular
        </Button>
      </form>

      {estimated && (
        <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs space-y-1">
          <div className="flex justify-between font-bold text-slate-900">
            <span>Transportadora Rodoviária B2B</span>
            <span className="text-green-700">3 a 5 dias úteis</span>
          </div>
          <p className="text-[11px] text-slate-400">
            * Valores definitivos de frete e paletização calculados no checkout conforme o peso total.
          </p>
        </div>
      )}
    </div>
  )
}
