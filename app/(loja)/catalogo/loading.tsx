import { Container } from '@/components/ui/container'
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton'

export default function CatalogLoading() {
  return (
    <div className="py-6 bg-slate-50 min-h-screen">
      <Container className="space-y-6">
        <Skeleton className="h-4 w-48" />

        <div className="space-y-2 border-b border-slate-200 pb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-40" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
