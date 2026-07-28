import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Tag } from 'lucide-react'
import { Container } from '@/components/ui/container'
import type { CollectionCampaign } from '@/lib/mocks/mock-collections'

interface CampaignGridProps {
  collections: CollectionCampaign[]
}

export function CampaignGrid({ collections }: CampaignGridProps) {
  return (
    <section className="py-12 bg-slate-50 border-b border-slate-200">
      <Container className="space-y-8">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Tag className="h-4 w-4" />
            <span>Campanhas Sazonais & Temáticas</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Campanhas em Destaque
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Coleções selecionadas para atender os picos de demanda dos seus clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-orange-500 hover:shadow-md transition-all"
            >
              {item.badge && (
                <span className="absolute top-4 right-4 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {item.badge}
                </span>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {item.itemCount} opções em catálogo
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href={`/categoria/${item.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 group-hover:text-orange-700 group-hover:underline"
                >
                  <span>{item.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
