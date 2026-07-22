'use client'

import { useState } from 'react'
import { Copy, Check, Share2, MessageCircle, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface ProductShareModalProps {
  isOpen: boolean
  onClose: () => void
  productName: string
}

export function ProductShareModal({ isOpen, onClose, productName }: ProductShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsApp = () => {
    if (typeof window !== 'undefined') {
      const text = encodeURIComponent(
        `Confira este produto na Central Atacado: ${productName}\n${window.location.href}`,
      )
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartilhar Produto">
      <div className="space-y-4 pt-2">
        <p className="text-xs text-slate-500">
          Compartilhe este item com a sua equipe ou parceiros comerciais:
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-3 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
