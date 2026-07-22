import { Container } from '@/components/ui/container'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

export default function ProductLoading() {
  return (
    <div className="py-6 bg-slate-50 min-h-screen">
      <Container className="space-y-8">
        <Skeleton className="h-4 w-48" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Container>
    </div>
  )
}
