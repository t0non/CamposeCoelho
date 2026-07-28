import { getAdminPriceTables } from '@/lib/data/admin-catalog'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { Pencil, Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    vigence?: string
    sort?: string
    page?: string
  }>
}

export default async function PriceTablesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1') || 1
  const limit = 20

  const { data, count } = await getAdminPriceTables(
    page,
    limit,
    params.q,
    params.status,
    params.vigence,
    params.sort
  )

  const totalPages = Math.ceil(count / limit)

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tabelas de Preços</h1>
          <p className="text-slate-500 text-sm">Gerencie múltiplos canais de venda e tabelas de preços corporativas.</p>
        </div>
        <Link href="/admin/tabelas-de-precos/nova">
          <Button variant="primary" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Tabela
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white border p-4 rounded-md shadow-sm">
        <form method="GET" action="/admin/tabelas-de-precos" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Busca</label>
            <input
              type="text"
              name="q"
              defaultValue={params.q || ''}
              placeholder="Nome da tabela..."
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
            <select name="status" defaultValue={params.status || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Vigência</label>
            <select name="vigence" defaultValue={params.vigence || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              <option value="vigente">Vigente</option>
              <option value="futura">Futura</option>
              <option value="expirada">Expirada</option>
            </select>
          </div>

          <div className="w-full sm:w-40">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ordenação</label>
            <select name="sort" defaultValue={params.sort || ''} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Última Atualização</option>
              <option value="name">Nome</option>
              <option value="starts_at">Data de Início</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="h-9 inline-flex items-center justify-center font-medium bg-slate-900 text-white hover:bg-slate-800 px-4 rounded-md text-sm">
              Filtrar
            </button>
            {(params.q || params.status || params.vigence || params.sort) && (
              <Link href="/admin/tabelas-de-precos" className="h-9 inline-flex items-center justify-center font-medium border border-slate-300 hover:bg-slate-50 px-4 rounded-md text-sm text-slate-700">
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Listagem */}
      <div className="bg-white border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead className="text-right">Preços Cadastrados</TableHead>
              <TableHead className="text-right">Empresas Vinculadas</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma tabela de preços encontrada.
                </TableCell>
              </TableRow>
            ) : (
              data.map((table: any) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium text-sm">
                    <Link href={`/admin/tabelas-de-precos/${table.id}`} className="text-blue-600 hover:underline">
                      {table.name}
                    </Link>
                    {table.is_default && (
                      <span className="ml-2 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Padrão</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{table.description || '—'}</TableCell>
                  <TableCell>
                    {table.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{table.starts_at ? formatDateTime(table.starts_at) : 'Imediato'}</TableCell>
                  <TableCell className="text-xs">{table.ends_at ? formatDateTime(table.ends_at) : 'Indeterminado'}</TableCell>
                  <TableCell className="text-right text-sm">{table.prices_count}</TableCell>
                  <TableCell className="text-right text-sm">{table.companies_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(table.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/tabelas-de-precos/${table.id}`}>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0" title="Editar Preços e Vigências">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-slate-500">
            Mostrando página {page} de {totalPages} ({count} tabelas no total)
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Anterior</span>
            ) : (
              <Link href={`/admin/tabelas-de-precos?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Anterior
              </Link>
            )}
            {page >= totalPages ? (
              <span className="inline-flex items-center justify-center font-medium border text-slate-400 bg-slate-50 opacity-60 h-8 px-3 text-xs rounded-md cursor-not-allowed">Próxima</span>
            ) : (
              <Link href={`/admin/tabelas-de-precos?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`} className="inline-flex items-center justify-center font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
