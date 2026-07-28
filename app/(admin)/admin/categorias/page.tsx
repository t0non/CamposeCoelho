import { Suspense } from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/auth'
import { getAdminCategories } from '@/lib/data/admin-catalog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState } from '@/components/admin/admin-empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Pagination } from '@/components/ui/pagination'

export const metadata = { title: 'Admin — Categorias' }

// O Next.js recomenda aguardar searchParams
export default async function AdminCategoriesPage({
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
  
  // Como estamos no admin, ignoramos cache (Next 15+ padrão é dinâmico, mas force-dynamic garante)
  const { data: categories, count } = await getAdminCategories(page, limit, search, status, sort)
  
  const totalPages = Math.ceil(count / limit)

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Categorias" 
        description="Gerencie a estrutura de categorias do catálogo."
        action={
          <Link href="/admin/categorias/nova">
            <Button>Nova Categoria</Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-md border border-gray-200">
        <div className="flex-1 w-full max-w-sm">
          <SearchInput placeholder="Buscar categoria..." />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/admin/categorias" className="text-sm text-blue-600 hover:underline">
            Limpar Filtros
          </Link>
        </div>
      </div>

      {!categories.length ? (
        search || status ? (
          <AdminEmptyState 
            title="Nenhuma categoria encontrada" 
            description="Tente ajustar seus filtros para ver mais resultados." 
            action={<Link href="/admin/categorias"><Button variant="secondary">Limpar Filtros</Button></Link>}
          />
        ) : (
          <AdminEmptyState 
            title="Nenhuma categoria cadastrada" 
            description="Comece criando a primeira categoria do seu catálogo." 
            action={<Link href="/admin/categorias/nova"><Button>Criar Primeira Categoria</Button></Link>}
          />
        )
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-gray-500">{category.slug}</TableCell>
                  <TableCell>{category.position}</TableCell>
                  <TableCell>{(category as any).products?.[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <StatusBadge isActive={category.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/categorias/${category.id}`}>
                      <Button variant="outline" size="sm">Editar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/categorias" params={{}} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
