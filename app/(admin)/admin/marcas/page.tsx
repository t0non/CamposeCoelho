import { Suspense } from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminBrands } from '@/lib/data/admin-catalog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState } from '@/components/admin/admin-empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Pagination } from '@/components/ui/pagination'

export const metadata = { title: 'Admin — Marcas' }

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireAdmin()
  const params = await searchParams

  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const search = typeof params.search === 'string' ? params.search : undefined
  const status = typeof params.status === 'string' ? params.status : undefined
  const sort = typeof params.sort === 'string' ? params.sort : undefined

  const limit = 20
  
  const { data: brands, count } = await getAdminBrands(page, limit, search, status, sort)
  
  const totalPages = Math.ceil(count / limit)

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Marcas" 
        description="Gerencie as marcas disponíveis no catálogo de produtos."
        action={
          <Link href="/admin/marcas/nova">
            <Button>Nova Marca</Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-md border border-gray-200">
        <div className="flex-1 w-full max-w-sm">
          <SearchInput placeholder="Buscar marca..." />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/admin/marcas" className="text-sm text-blue-600 hover:underline">
            Limpar Filtros
          </Link>
        </div>
      </div>

      {!brands.length ? (
        search || status ? (
          <AdminEmptyState 
            title="Nenhuma marca encontrada" 
            description="Tente ajustar seus filtros para ver mais resultados." 
            action={<Link href="/admin/marcas"><Button variant="secondary">Limpar Filtros</Button></Link>}
          />
        ) : (
          <AdminEmptyState 
            title="Nenhuma marca cadastrada" 
            description="Comece criando a primeira marca do seu catálogo." 
            action={<Link href="/admin/marcas/nova"><Button>Criar Primeira Marca</Button></Link>}
          />
        )
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 object-contain rounded border border-gray-200 bg-white" />
                    ) : (
                      <div className="h-8 w-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-gray-500">{brand.slug}</TableCell>
                  <TableCell>{(brand as any).products?.[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <StatusBadge isActive={brand.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/marcas/${brand.id}`}>
                      <Button variant="outline" size="sm">Editar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/marcas" params={{}} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
