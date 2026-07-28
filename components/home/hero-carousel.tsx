'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroBannerItem } from '@/lib/mocks/mock-banners'

interface HeroCarouselProps {
  banners: HeroBannerItem[]
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(handleNext, 6000)
    return () => clearInterval(timer)
  }, [handleNext, isPaused])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) handleNext()
    else if (diff < -50) handlePrev()
    touchStartX.current = null
  }

  if (!banners || banners.length === 0) return null

  return (
    <section
      aria-label="Banners de destaque"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden select-none bg-gray-100 w-full"
    >
      {/* Slider Track */}
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, idx) => (
          <div key={banner.id} className="w-full shrink-0 relative">
            <Link href={banner.primaryCta?.href || '/catalogo'} className="block w-full h-full">
              {/* Desktop Image (Hidden on small screens) */}
              <div className="hidden md:block relative w-full aspect-[21/6] lg:aspect-[24/6]">
                <Image
                  src={banner.desktopImage}
                  alt={banner.title}
                  fill
                  priority={idx === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              </div>

              {/* Mobile Image (Visible only on small screens) */}
              <div className="block md:hidden relative w-full aspect-[4/5] sm:aspect-[1/1]">
                <Image
                  src={banner.mobileImage}
                  alt={banner.title}
                  fill
                  priority={idx === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Banner anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 text-[#1b3b6f] hover:bg-[#ffe000] shadow-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffe000]"
      >
        <ChevronLeft className="h-6 w-6 stroke-[3]" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Próximo banner"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 text-[#1b3b6f] hover:bg-[#ffe000] shadow-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffe000]"
      >
        <ChevronRight className="h-6 w-6 stroke-[3]" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Ir para banner ${idx + 1}`}
            className={`rounded-full transition-all duration-300 shadow-sm ${
              idx === currentIndex
                ? 'w-8 h-2.5 bg-[#ffe000]'
                : 'w-2.5 h-2.5 bg-white/60 hover:bg-white/90'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
