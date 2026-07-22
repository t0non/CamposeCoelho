'use client'

import { useState, useCallback } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

let toastCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'info',
    }: {
      title: string
      description?: string
      variant?: ToastVariant
    }) => {
      const id = `toast-${++toastCounter}`
      const newToast: Toast = { id, title, description, variant }

      setToasts((prev) => [...prev, newToast])

      // Auto-remove após 5 segundos
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    [],
  )

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
