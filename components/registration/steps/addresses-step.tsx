'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressesStepSchema } from '@/lib/validations/registration'
import { maskCEP } from '@/lib/utils/masks'
import { lookupAddressByCep } from '@/lib/services/registration-service'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, MapPin, Search } from 'lucide-react'
import type { RegistrationAddresses } from '@/types/registration.types'

interface AddressesStepProps {
  initialValues?: Partial<RegistrationAddresses>
  onSubmit: (data: RegistrationAddresses) => void
  onBack: () => void
}

export function AddressesStep({ initialValues, onSubmit, onBack }: AddressesStepProps) {
  const [loadingCep, setLoadingCep] = useState<Record<string, boolean>>({})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressesStepSchema),
    defaultValues: {
      isShippingSameAsFiscal: initialValues?.isShippingSameAsFiscal ?? true,
      isBillingSameAsFiscal: initialValues?.isBillingSameAsFiscal ?? true,
      fiscal: {
        cep: initialValues?.fiscal?.cep ?? '',
        street: initialValues?.fiscal?.street ?? '',
        number: initialValues?.fiscal?.number ?? '',
        complement: initialValues?.fiscal?.complement ?? '',
        neighborhood: initialValues?.fiscal?.neighborhood ?? '',
        city: initialValues?.fiscal?.city ?? '',
        state: initialValues?.fiscal?.state ?? '',
        referencePoint: initialValues?.fiscal?.referencePoint ?? '',
      },
      shipping: {
        cep: initialValues?.shipping?.cep ?? '',
        street: initialValues?.shipping?.street ?? '',
        number: initialValues?.shipping?.number ?? '',
        complement: initialValues?.shipping?.complement ?? '',
        neighborhood: initialValues?.shipping?.neighborhood ?? '',
        city: initialValues?.shipping?.city ?? '',
        state: initialValues?.shipping?.state ?? '',
        referencePoint: initialValues?.shipping?.referencePoint ?? '',
      },
      billing: {
        cep: initialValues?.billing?.cep ?? '',
        street: initialValues?.billing?.street ?? '',
        number: initialValues?.billing?.number ?? '',
        complement: initialValues?.billing?.complement ?? '',
        neighborhood: initialValues?.billing?.neighborhood ?? '',
        city: initialValues?.billing?.city ?? '',
        state: initialValues?.billing?.state ?? '',
        referencePoint: initialValues?.billing?.referencePoint ?? '',
      },
    },
  })

  const isShippingSame = watch('isShippingSameAsFiscal')
  const isBillingSame = watch('isBillingSameAsFiscal')

  // Auto-preenchimento por CEP simulado
  const handleCepBlur = async (prefix: 'fiscal' | 'shipping' | 'billing', cepVal: string) => {
    const clean = cepVal.replace(/\D/g, '')
    if (clean.length === 8) {
      setLoadingCep((prev) => ({ ...prev, [prefix]: true }))
      const found = await lookupAddressByCep(clean)
      setLoadingCep((prev) => ({ ...prev, [prefix]: false }))

      if (found) {
        setValue(`${prefix}.street`, found.street, { shouldValidate: true })
        setValue(`${prefix}.neighborhood`, found.neighborhood, { shouldValidate: true })
        setValue(`${prefix}.city`, found.city, { shouldValidate: true })
        setValue(`${prefix}.state`, found.state, { shouldValidate: true })
      }
    }
  }

  // Helper de formulário de endereço
  const renderAddressFields = (prefix: 'fiscal' | 'shipping' | 'billing', disabled = false) => {
    const fieldErrors = errors[prefix] as any

    return (
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        {/* CEP */}
        <div className="space-y-1">
          <Input
            label="CEP"
            placeholder="00000-000"
            disabled={disabled}
            {...register(`${prefix}.cep`)}
            onChange={(e) => {
              const masked = maskCEP(e.target.value)
              setValue(`${prefix}.cep`, masked, { shouldValidate: true })
            }}
            onBlur={(e) => handleCepBlur(prefix, e.target.value)}
            error={fieldErrors?.cep?.message}
            required
          />
          {loadingCep[prefix] && (
            <span className="text-[10px] text-orange-600 font-semibold flex items-center gap-1">
              <Search className="h-3 w-3 animate-spin" /> Buscando CEP...
            </span>
          )}
        </div>

        {/* Logradouro */}
        <Input
          label="Logradouro (Rua / Avenida)"
          placeholder="Rua / Avenida"
          disabled={disabled}
          {...register(`${prefix}.street`)}
          error={fieldErrors?.street?.message}
          required
        />

        {/* Número */}
        <Input
          label="Número"
          placeholder="123 ou S/N"
          disabled={disabled}
          {...register(`${prefix}.number`)}
          error={fieldErrors?.number?.message}
          required
        />

        {/* Complemento */}
        <Input
          label="Complemento (Opcional)"
          placeholder="Bloco, Sala, Galpão..."
          disabled={disabled}
          {...register(`${prefix}.complement`)}
          error={fieldErrors?.complement?.message}
        />

        {/* Bairro */}
        <Input
          label="Bairro"
          placeholder="Bairro"
          disabled={disabled}
          {...register(`${prefix}.neighborhood`)}
          error={fieldErrors?.neighborhood?.message}
          required
        />

        {/* Cidade */}
        <Input
          label="Cidade"
          placeholder="Cidade"
          disabled={disabled}
          {...register(`${prefix}.city`)}
          error={fieldErrors?.city?.message}
          required
        />

        {/* Estado (UF) */}
        <Input
          label="Estado (UF)"
          placeholder="SP"
          maxLength={2}
          disabled={disabled}
          {...register(`${prefix}.state`)}
          onChange={(e) => setValue(`${prefix}.state`, e.target.value.toUpperCase())}
          error={fieldErrors?.state?.message}
          required
        />

        {/* Ponto de Referência */}
        <Input
          label="Ponto de Referência (Opcional)"
          placeholder="Próximo ao marco X"
          disabled={disabled}
          {...register(`${prefix}.referencePoint`)}
          error={fieldErrors?.referencePoint?.message}
        />
      </div>
    )
  }

  const handleFormSubmit = (data: any) => {
    let finalShipping = data.shipping
    let finalBilling = data.billing

    if (data.isShippingSameAsFiscal) {
      finalShipping = { ...data.fiscal }
    }

    if (data.isBillingSameAsFiscal) {
      finalBilling = { ...data.fiscal }
    }

    onSubmit({
      ...data,
      shipping: finalShipping,
      billing: finalBilling,
    } as RegistrationAddresses)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-8">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 3 — Endereços da Empresa</h2>
        <p className="text-xs text-slate-500">
          Cadastre o endereço fiscal registrado no CNPJ e defina os endereços de entrega e cobrança.
        </p>
      </div>

      {/* 1. Endereço Fiscal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span>Endereço Fiscal (Registrado na Receita Federal)</span>
        </div>
        {renderAddressFields('fiscal')}
      </div>

      {/* 2. Endereço de Entrega */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-navy-900" />
            <span>Endereço de Entrega das Mercadorias</span>
          </div>
          <Checkbox
            label="Mesmo endereço fiscal"
            checked={isShippingSame}
            onChange={(e) => setValue('isShippingSameAsFiscal', e.target.checked)}
          />
        </div>
        {!isShippingSame && renderAddressFields('shipping')}
      </div>

      {/* 3. Endereço de Cobrança */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span>Endereço de Cobrança / Faturamento</span>
          </div>
          <Checkbox
            label="Mesmo endereço fiscal"
            checked={isBillingSame}
            onChange={(e) => setValue('isBillingSameAsFiscal', e.target.checked)}
          />
        </div>
        {!isBillingSame && renderAddressFields('billing')}
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
