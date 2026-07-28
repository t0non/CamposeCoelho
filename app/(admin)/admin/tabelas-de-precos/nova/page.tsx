import { PriceTableForm } from '@/components/admin/PriceTableForm'

export default function NewPriceTablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Nova Tabela de Preços</h1>
        <p className="text-slate-500 text-sm">Preencha os dados básicos para criar um novo canal de vendas com regras de vigência.</p>
      </div>

      <PriceTableForm />
    </div>
  )
}
