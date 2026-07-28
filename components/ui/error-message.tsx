import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}
