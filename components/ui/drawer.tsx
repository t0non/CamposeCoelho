'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  position?: 'left' | 'right'
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({
  isOpen,
  onClose,
  title,
  position = 'right',
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.classList.add('overflow-hidden')
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Painel lateral'}
        className={cn(
          'relative flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out z-10',
          position === 'right' ? 'ml-auto' : 'mr-auto',
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Fechar painel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t border-slate-100 p-6 bg-slate-50">{footer}</div>}
      </div>
    </div>
  )
}
