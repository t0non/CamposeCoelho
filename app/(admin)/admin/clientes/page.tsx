'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/actions/admin/customers'
import { CustomerList, CustomerSummary } from '@/components/admin/customers/customer-list'
import { CustomerDetailsModal } from '@/components/admin/customers/customer-details-modal'
import { Search, Filter } from 'lucide-react'
import { useDebounce } from 'use-debounce'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  const fetchList = async () => {
    setIsLoading(true)
    const res = await getCustomers(debouncedSearch, statusFilter)
    if (res.customers) {
      setCustomers(res.customers as CustomerSummary[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchList()
  }, [debouncedSearch, statusFilter])

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b3b6f]">Clientes (Empresas)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aprove cadastros de novos lojistas, veja documentos e libere o acesso aos preços.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar CNPJ ou Nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-64 focus:ring-2 focus:ring-[#1b3b6f]/20 outline-none"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border rounded-md text-sm appearance-none bg-white focus:ring-2 focus:ring-[#1b3b6f]/20 outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Recusados</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && customers.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Carregando lista de clientes...</div>
      ) : (
        <CustomerList 
          customers={customers} 
          onSelectCustomer={(id) => setSelectedCompanyId(id)}
        />
      )}

      {selectedCompanyId && (
        <CustomerDetailsModal
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onUpdate={fetchList}
        />
      )}
    </div>
  )
}
