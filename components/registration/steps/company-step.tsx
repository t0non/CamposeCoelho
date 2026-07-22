'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyStepSchema } from '@/lib/validations/registration'
import { maskCNPJ, maskPhone } from '@/lib/utils/masks'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ArrowRight, Info } from 'lucide-react'
import type { CompanyData } from '@/types/registration.types'

interface CompanyStepProps {
  initialValues?: Partial<CompanyData>
  onSubmit: (data: CompanyData) => void
}

export function CompanyStep({ initialValues, onSubmit }: CompanyStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companyStepSchema),
    defaultValues: {
      cnpj: initialValues?.cnpj ?? '',
      companyName: initialValues?.companyName ?? '',
      tradingName: initialValues?.tradingName ?? '',
      stateRegistration: initialValues?.stateRegistration ?? '',
      isStateRegistrationExempt: initialValues?.isStateRegistrationExempt ?? false,
      segment: initialValues?.segment ?? '',
      businessType: initialValues?.businessType ?? '',
      employeeCount: initialValues?.employeeCount ?? '',
      phone: initialValues?.phone ?? '',
      whatsapp: initialValues?.whatsapp ?? '',
      email: initialValues?.email ?? '',
      website: initialValues?.website ?? '',
      foundationYear: initialValues?.foundationYear ?? '',
    },
  })

  const isExempt = watch('isStateRegistrationExempt')

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCNPJ(e.target.value)
    setValue('cnpj', masked, { shouldValidate: true })
  }

  const handlePhoneChange = (key: 'phone' | 'whatsapp', val: string) => {
    setValue(key, maskPhone(val), { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as unknown as CompanyData))} noValidate className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 1 — Dados da Empresa</h2>
        <p className="text-xs text-slate-500">
          Informe os dados fiscais e cadastrais da sua empresa (exclusivo para pessoas jurídicas com CNPJ).
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-800 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          A consulta automática de dados cadastrais do CNPJ estará disponível após a conexão do serviço de integração empresarial.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* CNPJ */}
        <Input
          label="CNPJ da Empresa"
          placeholder="00.000.000/0001-00"
          {...register('cnpj')}
          onChange={handleCnpjChange}
          error={errors.cnpj?.message}
          required
        />

        {/* Razão Social */}
        <Input
          label="Razão Social"
          placeholder="Nome empresarial registrado na Receita"
          {...register('companyName')}
          error={errors.companyName?.message}
          required
        />

        {/* Nome Fantasia */}
        <Input
          label="Nome Fantasia"
          placeholder="Nome comercial da sua loja ou marca"
          {...register('tradingName')}
          error={errors.tradingName?.message}
          required
        />

        {/* Inscrição Estadual */}
        <div className="space-y-2">
          <Input
            label="Inscrição Estadual (IE)"
            placeholder="000.000.000.000"
            disabled={isExempt}
            {...register('stateRegistration')}
            error={errors.stateRegistration?.message}
          />
          <Checkbox
            label="Isento de Inscrição Estadual"
            checked={isExempt}
            onChange={(e) => {
              setValue('isStateRegistrationExempt', e.target.checked)
              if (e.target.checked) setValue('stateRegistration', '')
            }}
          />
        </div>

        {/* Segmento */}
        <Select
          label="Segmento de Atuação"
          options={[
            { label: 'Supermercado / Mercearia', value: 'supermercado' },
            { label: 'Loja de Utilidades Domésticas', value: 'utilidades' },
            { label: 'Papelaria & Escritório', value: 'papelaria' },
            { label: 'Loja de Brinquedos', value: 'brinquedos' },
            { label: 'Loja de Ferramentas / Ferragens', value: 'ferramentas' },
            { label: 'Loja de Eletrônicos / Acessórios', value: 'eletronicos' },
            { label: 'Loja de Decoração & Presentes', value: 'decoracao' },
            { label: 'Distribuidor / Atacadista', value: 'distribuidor' },
            { label: 'Outro Segmento Comercial', value: 'outro' },
          ]}
          {...register('segment')}
          error={errors.segment?.message}
          required
        />

        {/* Tipo de Negócio */}
        <Select
          label="Tipo de Negócio"
          options={[
            { label: 'Matriz', value: 'matriz' },
            { label: 'Filial', value: 'filial' },
            { label: 'MEI (Microempreendedor)', value: 'mei' },
            { label: 'Microempresa (ME)', value: 'me' },
            { label: 'Empresa de Pequeno Porte (EPP)', value: 'epp' },
            { label: 'Média ou Grande Empresa', value: 'grande' },
          ]}
          {...register('businessType')}
          error={errors.businessType?.message}
          required
        />

        {/* Número de Funcionários */}
        <Select
          label="Número de Funcionários"
          options={[
            { label: '1 a 5 colaboradores', value: '1-5' },
            { label: '6 a 15 colaboradores', value: '6-15' },
            { label: '16 a 50 colaboradores', value: '16-50' },
            { label: 'Mais de 50 colaboradores', value: '50+' },
          ]}
          {...register('employeeCount')}
          error={errors.employeeCount?.message}
          required
        />

        {/* E-mail Comercial */}
        <Input
          type="email"
          label="E-mail Comercial da Empresa"
          placeholder="compras@empresa.com.br"
          {...register('email')}
          error={errors.email?.message}
          required
        />

        {/* Telefone Comercial */}
        <Input
          label="Telefone Comercial (Fixo)"
          placeholder="(00) 0000-0000"
          {...register('phone')}
          onChange={(e) => handlePhoneChange('phone', e.target.value)}
          error={errors.phone?.message}
          required
        />

        {/* WhatsApp Comercial */}
        <Input
          label="WhatsApp Comercial da Empresa"
          placeholder="(00) 90000-0000"
          {...register('whatsapp')}
          onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
          error={errors.whatsapp?.message}
          required
        />

        {/* Site (Opcional) */}
        <Input
          label="Website da Empresa (Opcional)"
          placeholder="https://www.suaempresa.com.br"
          {...register('website')}
          error={errors.website?.message}
        />

        {/* Ano de Fundação (Opcional) */}
        <Input
          label="Ano de Fundação (Opcional)"
          placeholder="Ex: 2018"
          {...register('foundationYear')}
          error={errors.foundationYear?.message}
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button type="submit" variant="accent" className="px-8 font-bold">
          <span>Salvar e Continuar</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </form>
  )
}
