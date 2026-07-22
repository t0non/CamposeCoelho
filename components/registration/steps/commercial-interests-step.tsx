'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { commercialInterestsStepSchema } from '@/lib/validations/registration'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Tag } from 'lucide-react'
import type { CommercialInterestsData } from '@/types/registration.types'

interface CommercialInterestsStepProps {
  initialValues?: Partial<CommercialInterestsData>
  onSubmit: (data: CommercialInterestsData) => void
  onBack: () => void
}

const availableCategories = [
  'Utilidades Domésticas',
  'Brinquedos & Jogos',
  'Ferramentas & Acessórios',
  'Papelaria & Escritório',
  'Eletrônicos & Áudio',
  'Decoração & Lar',
  'Beleza & Cuidados',
  'Infantil & Bebê',
  'Pet Shop',
  'Esporte & Lazer',
]

const availableStates = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'GO', 'BA', 'PE', 'DF', 'Outros']

export function CommercialInterestsStep({
  initialValues,
  onSubmit,
  onBack,
}: CommercialInterestsStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CommercialInterestsData>({
    resolver: zodResolver(commercialInterestsStepSchema),
    defaultValues: {
      categories: ['Utilidades Domésticas'],
      operatingStates: ['SP'],
      ...initialValues,
    },
  })

  const selectedCategories = watch('categories') || []
  const selectedStates = watch('operatingStates') || []

  const toggleCategory = (cat: string) => {
    const current = selectedCategories
    const updated = current.includes(cat)
      ? current.filter((item) => item !== cat)
      : [...current, cat]
    setValue('categories', updated, { shouldValidate: true })
  }

  const toggleState = (uf: string) => {
    const current = selectedStates
    const updated = current.includes(uf)
      ? current.filter((item) => item !== uf)
      : [...current, uf]
    setValue('operatingStates', updated, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 5 — Interesses Comerciais</h2>
        <p className="text-xs text-slate-500">
          Ajude nossa equipe a personalizar ofertas e tabelas comerciais adequadas ao perfil da sua empresa.
        </p>
      </div>

      {/* 1. Categorias de Interesse */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Categorias de Maior Interesse no Atacado *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {availableCategories.map((cat) => {
            const isChecked = selectedCategories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                  isChecked
                    ? 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
        {errors.categories && (
          <p className="text-xs text-red-500 font-medium">{errors.categories.message}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Frequência de Compra */}
        <Select
          label="Frequência Estimada de Compra"
          options={[
            { label: 'Semanal', value: 'semanal' },
            { label: 'Quinzenal', value: 'quinzenal' },
            { label: 'Mensal', value: 'mensal' },
            { label: 'A cada 2 meses', value: 'bimestral' },
            { label: 'Conforme necessidade', value: 'eventual' },
          ]}
          {...register('purchaseFrequency')}
          error={errors.purchaseFrequency?.message}
          required
        />

        {/* Valor Médio por Pedido */}
        <Select
          label="Valor Médio de Compra por Pedido"
          options={[
            { label: 'Até R$ 1.000 (Mínimo)', value: 'ate_1000' },
            { label: 'R$ 1.001 a R$ 3.000', value: '1001_3000' },
            { label: 'R$ 3.001 a R$ 10.000', value: '3001_10000' },
            { label: 'Acima de R$ 10.000', value: 'acima_10000' },
          ]}
          {...register('averageOrderValue')}
          error={errors.averageOrderValue?.message}
          required
        />

        {/* Número de Lojas */}
        <Select
          label="Número de Lojas / Pontos de Venda"
          options={[
            { label: '1 loja física / ponto de venda', value: '1' },
            { label: '2 a 5 lojas', value: '2-5' },
            { label: '6 a 10 lojas', value: '6-10' },
            { label: 'Mais de 10 lojas', value: '10+' },
          ]}
          {...register('storeCount')}
          error={errors.storeCount?.message}
          required
        />

        {/* Canal Principal de Vendas */}
        <Select
          label="Canal Principal de Vendas da Empresa"
          options={[
            { label: 'Loja Física / Balcão', value: 'loja_fisica' },
            { label: 'E-commerce Próprio', value: 'ecommerce' },
            { label: 'Marketplaces (Mercado Livre, Shopee, Amazon)', value: 'marketplace' },
            { label: 'Venda por Catálogo / WhatsApp', value: 'catalogo_whatsapp' },
            { label: 'Distribuição / Atacado Regional', value: 'distribuicao' },
            { label: 'Outros Canais', value: 'outros' },
          ]}
          {...register('salesChannel')}
          error={errors.salesChannel?.message}
          required
        />

        {/* Como Conheceu */}
        <Select
          label="Como Conheceu a Central Atacado?"
          options={[
            { label: 'Busca na Internet (Google)', value: 'google' },
            { label: 'Indicação de Parceiro / Lojista', value: 'indicacao' },
            { label: 'Redes Sociais (Instagram/Facebook)', value: 'redes_sociais' },
            { label: 'Feira Comercial ou Evento B2B', value: 'feira' },
            { label: 'Outro Meio', value: 'outro' },
          ]}
          {...register('howDidYouHear')}
          error={errors.howDidYouHear?.message}
          required
        />

        {/* Principais Produtos Procurados */}
        <Input
          label="Principais Produtos Procurados (Opcional)"
          placeholder="Ex: Potes de vidro, panelas inox, alicates..."
          {...register('mainProducts')}
          error={errors.mainProducts?.message}
        />
      </div>

      {/* 2. Estados de Atuação */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Estados Principais de Atuação da Empresa *
        </label>
        <div className="flex flex-wrap gap-2">
          {availableStates.map((uf) => {
            const isChecked = selectedStates.includes(uf)
            return (
              <button
                key={uf}
                type="button"
                onClick={() => toggleState(uf)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isChecked
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {uf}
              </button>
            )
          })}
        </div>
        {errors.operatingStates && (
          <p className="text-xs text-red-500 font-medium">{errors.operatingStates.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Voltar</span>
        </Button>
        <Button type="submit" variant="accent" className="px-8 font-bold">
          <span>Salvar e Continuar</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </form>
  )
}
