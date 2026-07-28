'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { mockCompany } from '@/lib/mocks/mock-company'

export function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false)

  const encodedMessage = encodeURIComponent(
    mockCompany.contact.whatsappMessage || 'Olá, gostaria de informações sobre vendas no atacado.'
  )
  const whatsappUrl = `https://wa.me/55${mockCompany.contact.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tooltip */}
      <div
        className={`hidden sm:flex items-center gap-2 rounded-lg bg-[#1b3b6f] px-3.5 py-2 text-xs font-bold text-white shadow-xl transition-all duration-200 border border-blue-900 ${
          showTooltip ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
        }`}
        role="tooltip"
      >
        <span className="h-2 w-2 rounded-full bg-[#25d366] animate-pulse" />
        <span>Fale com nosso Atendimento B2B</span>
      </div>

      {/* Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Atendimento via WhatsApp B2B"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] hover:bg-[#20ba5a] text-white shadow-xl hover:scale-110 transition-all cursor-pointer border-2 border-white"
      >
        <MessageCircle className="h-8 w-8 fill-current stroke-none" aria-hidden="true" />
      </a>
    </div>
  )
}
