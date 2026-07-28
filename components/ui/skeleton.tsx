import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className,
      )}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <Skeleton className="h-48 w-full rounded-lg" />
      <SkeletonText lines={2} />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}
