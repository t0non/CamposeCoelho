import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminProducts } from '@/lib/data/admin-products'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { getAdminCategories } from '@/lib/data/admin-catalog'
import { getAdminBrands } from '@/lib/data/admin-catalog'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    brand?: string
    status?: string
    publication?: string
    sort?: string
    page?: string
  }>
}) {
  const { user } = await requireAdmin()
  const params = await searchParams

  const page = parseInt(params.page || '1', 10)
  const limit = 20

  const { data: products, count } = await getAdminProducts({
    q: params.q,
    category: params.category,
    brand: params.brand,
    status: params.status,
    publication: params.publication,
    sort: params.sort,
    page: page,
    pageSize: limit,
  })

  // Para filtros
  const { data: categories } = await getAdminCategories()
  const { data: brands } = await getAdminBrands()

  const totalPages = Math.ceil(count / limit)
  
  // Storage public URL builder
  const getImageUrl = (path: string) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Produtos"
        description="Gerencie os produtos do seu catálogo B2B."
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/produtos/importar?mode=import_update" className="inline-flex items-center justify-center gap-2 font-medium bg-slate-800 text-white hover:bg-slate-700 h-10 px-4 text-sm rounded-lg">
              Importar planilha
            </Link>
            <Link href="/admin/produtos/novo" className="inline-flex items-center justify-center gap-2 font-medium bg-navy-900 text-white hover:bg-navy-800 active:bg-slate-950 h-10 px-4 text-sm rounded-lg">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Link>
          </div>
        }
      />

      {/* FILTROS (Mínimos por GET Form para manter sem state client) */}
      <div className="bg-white p-4 rounded-md border flex flex-col sm:flex-row gap-4 items-end">
        <form className="flex-1 flex flex-col sm:flex-row gap-4 w-full" method="GET" action="/admin/produtos">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                placeholder="Nome, Slug ou SKU"
                className="w-full pl-9 h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
            <select name="category" defaultValue={params.category} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Marca</label>
            <select name="brand" defaultValue={params.brand} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="text-xs text-muted-foreground mb-1 block">Publicação</label>
            <select name="publication" defaultValue={params.publication} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todas</option>
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select name="status" defaultValue={params.status} className="w-full h-9 flex rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <Button type="submit" variant="secondary" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          
          {(params.q || params.category || params.brand || params.status || params.publication) && (
            <Link href="/admin/produtos" className="inline-flex items-center justify-center gap-2 font-medium text-slate-700 bg-transparent hover:bg-slate-100 h-9 px-4 rounded-md">
              Limpar
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>SKU / Slug</TableHead>
              <TableHead>Categoria / Marca</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const primaryImage = product.images?.[0]?.url
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-10 w-10 relative rounded border overflow-hidden bg-muted flex items-center justify-center">
                        {primaryImage ? (
                          <Image src={getImageUrl(primaryImage)!} alt={product.name} fill className="object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem img</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{product.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{product.sku}</div>
                      <div className="text-xs text-muted-foreground">{product.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{product.category?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{product.brand?.name || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{product.variants[0]?.count || 0}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={product.is_published} activeLabel="Publicado" inactiveLabel="Rascunho" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={product.is_active} activeLabel="Ativo" inactiveLabel="Inativo" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/produtos/${product.id}`} className="inline-flex items-center justify-center gap-2 font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                        Editar
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando página {page} de {totalPages} ({count} produtos no total)
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <span className="inline-flex items-center justify-center gap-2 font-medium border border-slate-300 text-slate-700 bg-white opacity-50 cursor-not-allowed h-8 px-3 text-xs rounded-md">Anterior</span>
            ) : (
              <Link href={`/admin/produtos?${new URLSearchParams({...params, page: String(page - 1)}).toString()}`} className="inline-flex items-center justify-center gap-2 font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Anterior
              </Link>
            )}
            {page >= totalPages ? (
              <span className="inline-flex items-center justify-center gap-2 font-medium border border-slate-300 text-slate-700 bg-white opacity-50 cursor-not-allowed h-8 px-3 text-xs rounded-md">Próxima</span>
            ) : (
              <Link href={`/admin/produtos?${new URLSearchParams({...params, page: String(page + 1)}).toString()}`} className="inline-flex items-center justify-center gap-2 font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-8 px-3 text-xs rounded-md">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
