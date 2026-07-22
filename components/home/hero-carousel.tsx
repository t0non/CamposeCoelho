'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/ui/container'
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

  // Autoplay moderado (6 segundos), pausado no hover
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(handleNext, 6000)
    return () => clearInterval(timer)
  }, [handleNext, isPaused])

  // Suporte a swipe mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    if (diff > 50) handleNext()
    else if (diff < -50) handlePrev()

    touchStartX.current = null
  }

  if (!banners || banners.length === 0) return null

  const activeBanner = banners[currentIndex]

  return (
    <section
      aria-label="Destaques e campanhas principais"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden bg-navy-900 text-white select-none"
    >
      <div className="relative min-h-[26rem] sm:min-h-[30rem] lg:min-h-[34rem] flex items-center">
        {/* Background Visual com Gradiente */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-800" />

        {/* Imagem Placeholder Decorativa */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 z-0 opacity-20 lg:opacity-40">
          <Image
            src={activeBanner.desktopImage}
            alt=""
            fill
            priority
            className="object-cover object-right"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <Container className="relative z-10 py-12 lg:py-16">
          <div className="max-w-2xl space-y-6">
            {/* Tag / Subtítulo */}
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-3.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/30 backdrop-blur-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>{activeBanner.subtitle}</span>
            </div>

            {/* Título Principal */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {activeBanner.title}
            </h1>

            {/* Descrição Comercial */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              {activeBanner.description}
            </p>

            {/* Botões CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={activeBanner.primaryCta.href}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <span>{activeBanner.primaryCta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {activeBanner.secondaryCta && (
                <Link
                  href={activeBanner.secondaryCta.href}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-navy-800/80 px-6 text-sm font-semibold text-slate-200 hover:bg-navy-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <span>{activeBanner.secondaryCta.label}</span>
                </Link>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Controles do Carrossel (Setas) */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Banner anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-navy-900/60 text-slate-300 backdrop-blur-xs border border-slate-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Próximo banner"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-navy-900/60 text-slate-300 backdrop-blur-xs border border-slate-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Indicadores (Dots) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {banners.map((banner, idx) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Ir para o banner ${idx + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-orange-500' : 'w-2.5 bg-slate-600 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
