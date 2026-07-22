import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import type { CategoryCardData } from '@/lib/mocks/mock-categories'

interface CategoryCardProps {
  category: CategoryCardData
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-orange-500 hover:shadow-md transition-all duration-200"
    >
      {category.badgeText && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
          {category.badgeText}
        </span>
      )}

      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-50 mb-3 flex items-center justify-center">
        <Image
          src={category.imageUrl}
          alt={category.name}
          fill
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
            {category.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {category.itemCount} produtos
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}
