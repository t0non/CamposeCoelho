import Link from 'next/link'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { CategoryCard } from '@/components/ui/category-card'
import type { CategoryCardData } from '@/lib/mocks/mock-categories'

interface FeaturedCategoriesProps {
  categories: CategoryCardData[]
}

export function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  return (
    <section className="py-12 bg-slate-50">
      <Container className="space-y-8">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <LayoutGrid className="h-4 w-4" />
              <span>Navegue pelo Catálogo</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Compre por Categoria
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Encontre rapidamente os produtos que combinam com o mix da sua loja.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0"
          >
            <span>Ver todas as categorias</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grade de Cards de Categorias */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </Container>
    </section>
  )
}
