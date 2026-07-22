import { Building2, Boxes, Headset, Truck } from 'lucide-react'
import { Container } from '@/components/ui/container'
import type { BenefitItem } from '@/lib/mocks/mock-benefits'

interface BenefitsBarProps {
  benefits: BenefitItem[]
}

const iconMap = {
  Building2,
  Boxes,
  Headset,
  Truck,
}

export function BenefitsBar({ benefits }: BenefitsBarProps) {
  return (
    <section className="bg-white border-b border-slate-200 py-6 select-none shadow-xs">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {benefits.map((benefit, idx) => {
            const Icon = iconMap[benefit.iconName] ?? Building2

            return (
              <div
                key={benefit.id}
                className={`flex items-start gap-3.5 ${
                  idx > 0 ? 'pt-4 md:pt-0 md:pl-6' : ''
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {benefit.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
