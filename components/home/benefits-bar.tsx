import { Building2, Boxes, Headset, Truck } from 'lucide-react'
import type { BenefitItem } from '@/lib/mocks/mock-benefits'

interface BenefitsBarProps {
  benefits: BenefitItem[]
}

const iconMap = { Building2, Boxes, Headset, Truck }

export function BenefitsBar({ benefits }: BenefitsBarProps) {
  return (
    <section className="bg-white border-b border-gray-200 py-4 select-none">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-gray-100">
          {benefits.map((benefit, idx) => {
            const Icon = iconMap[benefit.iconName as keyof typeof iconMap] ?? Building2
            return (
              <div
                key={benefit.id}
                className={`flex items-center gap-3 py-3 ${idx > 0 ? 'px-4' : 'pr-4'}`}
              >
                <div className="w-9 h-9 shrink-0 rounded-full bg-[#fff3ee] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#e8420a]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800 leading-snug">{benefit.title}</h3>
                  <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
