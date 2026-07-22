'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const galleryImages = images.length > 0 ? images : ['/placeholder-product.png']
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % galleryImages.length)
  }

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  return (
    <div className="space-y-4 select-none">
      {/* Contêiner da Imagem Principal */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 shadow-xs group">
        <Image
          src={galleryImages[selectedIndex]}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          fill
          priority
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {/* Botão de Zoom Ampliado */}
        <button
          type="button"
          onClick={() => setIsZoomOpen(true)}
          aria-label="Ampliar imagem do produto"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-sm border border-slate-200 backdrop-blur-xs hover:bg-orange-500 hover:text-white transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Indicador de Quantidade de Imagens */}
        {galleryImages.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-navy-900/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
            {selectedIndex + 1} / {galleryImages.length}
          </span>
        )}

        {/* Setas de Navegação (se houver > 1 imagem) */}
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200 hover:bg-orange-500 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200 hover:bg-orange-500 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Carrossel de Miniaturas */}
      {galleryImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
          {galleryImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              aria-label={`Selecionar miniatura ${idx + 1}`}
              className={`relative h-20 w-20 shrink-0 rounded-xl bg-white border-2 p-1 overflow-hidden transition-all ${
                idx === selectedIndex
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Modal Zoom Ampliado */}
      <Modal isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} title={`Zoom — ${productName}`}>
        <div className="relative aspect-square w-full max-h-[70vh] p-4 bg-white">
          <Image
            src={galleryImages[selectedIndex]}
            alt={productName}
            fill
            className="object-contain"
          />
        </div>
      </Modal>
    </div>
  )
}
