import { getAdminPriceTableById, getAdminPriceEntries, getAdminCategories, getAdminBrands } from '@/lib/data/admin-catalog'
import { PriceEntriesTable } from '@/components/admin/PriceEntriesTable'
import { PriceTableStatusToggle } from '@/components/admin/PriceTableStatusToggle'
import { PriceTableForm } from '@/components/admin/PriceTableForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Filter } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    q?: string
    category?: string
    brand?: string
    page?: string
  }>
}

export default async function PriceTableDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const tableId = resolvedParams.id

  if (!tableId || tableId.length !== 36) {
    return notFound()
  }

  const sParams = await searchParams
  const page = parseInt(sParams.page || '1') || 1
  const limit = 20

  const table: any = await getAdminPriceTableById(tableId).catch(() => null)
  if (!table) {
    return notFound()
  }

  const { data: categories } = await getAdminCategories(1, 100)
  const { data: brands } = await getAdminBrands(1, 100)

  const { data: variants, count } = await getAdminPriceEntries(
    tableId,
    page,
    limit,
    sParams.q,
    sParams.category,
    sParams.brand
  )

  const totalPages = Math.ceil(count / limit)

  return (
    <div className="space-y-8 text-slate-800">
      {/* Cabeçalho de detalhes */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{table.name}</h1>
            {table.is_active ? (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Ativa</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Inativa</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">{table.description || 'Sem descrição.'}</p>
        </div>
        <div className="flex gap-2">
          <PriceTableStatusToggle id={table.id} isActive={table.is_active} />
          <Link href="/admin/tabelas-de-precos" className="inline-flex items-center justify-center font-medium border border-slate-300 hover:bg-slate-50 h-9 px-4 rounded-md text-sm text-slate-700 bg-white">
            Voltar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Seção 1: Configuração Básica da Tabela */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Editar Dados Básicos</h2>
          <PriceTableForm initialData={table} />
        </div>

        {/* Seção 2: Cadastro e Consulta de Preços por Produto/Variante */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Valores e Preços por Variante</h2>

          {/* Filtros da listagem de preços */}
          <div className="bg-white border p-4 rounded-md shadow-sm">
            <form method="GET" action={`/admin/tabelas-de-precos/${tableId}`} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Buscar</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={sParams.q || ''}
                  placeholder="Nome ou SKU..."
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>

              <div className="w-full sm:w-36">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
                <select name="category" defaultValue={sParams.category || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">Todas</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="w-full sm:w-36">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Marca</label>
                <select name="brand" defaultValue={sParams.brand || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">Todas</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="h-9 inline-flex items-center justify-center gap-2 font-medium bg-slate-900 text-white hover:bg-slate-800 px-4 rounded-md text-sm">
                  <Filter className="h-4 w-4" />
                  Filtrar
                </button>
                {(sParams.q || sParams.category || sParams.brand) && (
                  <Link href={`/admin/tabelas-de-precos/${tableId}`} className="h-9 inline-flex items-center justify-center font-medium border border-slate-300 hover:bg-slate-50 px-4 rounded-md text-sm text-slate-700 bg-white">
                    Limpar
                  </Link>
                )}
              </div>
            </form>
          </div>

          <PriceEntriesTable priceTableId={tableId} variants={variants} />

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-slate-500">
                Mostrando página {page} de {totalPages} ({count} variantes no total)
              </p>
              <div className="flex gap-2">
                {page <= 1 ? (
                  <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Anterior</span>
                ) : (
                  <Link href={`/admin/tabelas-de-precos/${tableId}?${new URLSearchParams({ ...sParams, page: String(page - 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                    Anterior
                  </Link>
                )}
                {page >= totalPages ? (
                  <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Próxima</span>
                ) : (
                  <Link href={`/admin/tabelas-de-precos/${tableId}?${new URLSearchParams({ ...sParams, page: String(page + 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
