import React from 'react'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  isActive: boolean
  activeLabel?: string
  inactiveLabel?: string
}

export function StatusBadge({ isActive, activeLabel = 'Ativo', inactiveLabel = 'Inativo' }: StatusBadgeProps) {
  if (isActive) {
    return <Badge variant="success">{activeLabel}</Badge>
  }
  return <Badge variant="default">{inactiveLabel}</Badge>
}
