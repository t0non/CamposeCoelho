import { getAdminInventory } from '@/lib/data/admin-catalog'
import { InventoryTable } from '@/components/admin/InventoryTable'
import { getAdminCategories, getAdminBrands } from '@/lib/data/admin-catalog'
import Link from 'next/link'
import { Filter } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    q?: string
    situation?: string
    category?: string
    brand?: string
    status?: string
    sort?: string
    page?: string
  }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1') || 1
  const limit = 20

  const { data: categories } = await getAdminCategories(1, 100)
  const { data: brands } = await getAdminBrands(1, 100)

  const { data, count } = await getAdminInventory(
    page,
    limit,
    params.q,
    params.situation,
    params.category,
    params.brand,
    params.status,
    params.sort
  )

  const totalPages = Math.ceil(count / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Controle de Estoque</h1>
          <p className="text-slate-500 text-sm">Monitore e ajuste o estoque físico e as reservas de produtos.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border p-4 rounded-md shadow-sm">
        <form method="GET" action="/admin/estoque" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Busca</label>
            <input
              type="text"
              name="q"
              defaultValue={params.q || ''}
              placeholder="Nome do produto ou SKU..."
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Situação</label>
            <select name="situation" defaultValue={params.situation || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todos</option>
              <option value="zerado">Zerado</option>
              <option value="baixo">Baixo Estoque</option>
              <option value="disponivel">Disponível</option>
            </select>
          </div>

          <div className="w-full sm:w-44">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
            <select name="category" defaultValue={params.category || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-44">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Marca</label>
            <select name="brand" defaultValue={params.brand || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status Prod</label>
            <select name="status" defaultValue={params.status || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ordenação</label>
            <select name="sort" defaultValue={params.sort || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Atualizado</option>
              <option value="name">Nome do Produto</option>
              <option value="sku">SKU</option>
              <option value="available">Físico Disponível</option>
              <option value="reserved">Reservado</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="h-9 inline-flex items-center justify-center gap-2 font-medium bg-slate-900 text-white hover:bg-slate-800 px-4 rounded-md text-sm">
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            {(params.q || params.situation || params.category || params.brand || params.status || params.sort) && (
              <Link href="/admin/estoque" className="h-9 inline-flex items-center justify-center font-medium border border-slate-300 hover:bg-slate-50 px-4 rounded-md text-sm text-slate-700">
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      <InventoryTable data={data} />

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-slate-500">
            Mostrando página {page} de {totalPages} ({count} itens no total)
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Anterior</span>
            ) : (
              <Link href={`/admin/estoque?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Anterior
              </Link>
            )}
            {page >= totalPages ? (
              <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Próxima</span>
            ) : (
              <Link href={`/admin/estoque?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
