'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

interface SubmitButtonProps {
  label: string
  pendingLabel?: string
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
  disabled?: boolean
}

export function SubmitButton({ label, pendingLabel = 'Salvando...', variant = 'primary', className, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      variant={variant} 
      loading={pending} 
      disabled={pending || disabled}
      className={className}
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}
