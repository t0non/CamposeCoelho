'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { mockCompany } from '@/lib/mocks/mock-company'

export function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false)

  const encodedMessage = encodeURIComponent(mockCompany.contact.whatsappMessage)
  const whatsappUrl = `https://wa.me/55${mockCompany.contact.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      {/* Tooltip */}
      <div
        className={`hidden sm:flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xl transition-all duration-200 ${
          showTooltip ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
        }`}
        role="tooltip"
      >
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span>Fale com nosso consultor B2B</span>
      </div>

      {/* Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        aria-label="Atendimento via WhatsApp B2B"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-600/30 hover:bg-green-600 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-green-400/40 cursor-pointer"
      >
        <MessageCircle className="h-7 w-7 fill-current" aria-hidden="true" />
      </a>
    </div>
  )
}
