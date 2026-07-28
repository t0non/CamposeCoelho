import { cn } from '@/lib/utils/cn'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('border-b border-gray-100 px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('border-t border-gray-100 px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
