import React from 'react'
import { FileQuestion } from 'lucide-react'

interface AdminEmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-gray-200 border-dashed rounded-lg bg-white text-center">
      <FileQuestion className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
