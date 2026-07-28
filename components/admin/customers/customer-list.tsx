'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type CustomerSummary = {
  id: string
  cnpj: string
  company_name: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string
}

interface CustomerListProps {
  customers: CustomerSummary[]
  onSelectCustomer: (id: string) => void
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800'
}

const statusLabels = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  suspended: 'Suspenso'
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export function CustomerList({ customers, onSelectCustomer }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
        Nenhuma empresa encontrada com os filtros atuais.
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CNPJ</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Razão Social</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <tr 
                key={customer.id} 
                onClick={() => onSelectCustomer(customer.id)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="p-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {formatCNPJ(customer.cnpj)}
                </td>
                <td className="p-4 text-sm text-gray-700">
                  {customer.company_name}
                </td>
                <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                  {format(new Date(customer.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[customer.status]}`}>
                    {statusLabels[customer.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
