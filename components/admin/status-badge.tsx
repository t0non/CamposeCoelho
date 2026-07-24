import React from 'react'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  isActive: boolean
}

export function StatusBadge({ isActive }: StatusBadgeProps) {
  if (isActive) {
    return <Badge variant="success">Ativo</Badge>
  }
  return <Badge variant="default">Inativo</Badge>
}
