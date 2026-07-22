'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { responsibleStepSchema, getPasswordStrength } from '@/lib/validations/registration'
import { maskCPF, maskPhone } from '@/lib/utils/masks'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import type { ResponsibleData } from '@/types/registration.types'

interface ResponsibleStepProps {
  initialValues?: Partial<ResponsibleData>
  onSubmit: (data: ResponsibleData) => void
  onBack: () => void
}

export function ResponsibleStep({ initialValues, onSubmit, onBack }: ResponsibleStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(responsibleStepSchema),
    defaultValues: {
      fullName: initialValues?.fullName ?? '',
      cpf: initialValues?.cpf ?? '',
      role: initialValues?.role ?? '',
      department: initialValues?.department ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      whatsapp: initialValues?.whatsapp ?? '',
      password: initialValues?.password ?? '',
      confirmPassword: initialValues?.confirmPassword ?? '',
    },
  })

  const passwordVal = watch('password') || ''
  const passwordStrength = getPasswordStrength(passwordVal)

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', maskCPF(e.target.value), { shouldValidate: true })
  }

  const handlePhoneChange = (key: 'phone' | 'whatsapp', val: string) => {
    setValue(key, maskPhone(val), { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as unknown as ResponsibleData))} noValidate className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 2 — Responsável pela Conta</h2>
        <p className="text-xs text-slate-500">
          Dados da pessoa física autorizada a responder pelas compras e pelo acesso ao painel da empresa.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Nome Completo */}
        <Input
          label="Nome Completo do Responsável"
          placeholder="Nome igual ao documento oficial"
          {...register('fullName')}
          error={errors.fullName?.message}
          required
        />

        {/* CPF */}
        <Input
          label="CPF do Responsável"
          placeholder="000.000.000-00"
          {...register('cpf')}
          onChange={handleCpfChange}
          error={errors.cpf?.message}
          required
        />

        {/* Cargo */}
        <Select
          label="Cargo na Empresa"
          options={[
            { label: 'Proprietário / Sócio', value: 'proprietario' },
            { label: 'Diretor Comercial / Geral', value: 'diretor' },
            { label: 'Gerente de Compras', value: 'gerente_compras' },
            { label: 'Comprador / Suprimentos', value: 'comprador' },
            { label: 'Financeiro / Administrativo', value: 'financeiro' },
            { label: 'Outro Cargo', value: 'outro' },
          ]}
          {...register('role')}
          error={errors.role?.message}
          required
        />

        {/* Departamento (Opcional) */}
        <Input
          label="Departamento (Opcional)"
          placeholder="Ex: Departamento de Compras"
          {...register('department')}
          error={errors.department?.message}
        />

        {/* E-mail Pessoal / Corporativo */}
        <Input
          type="email"
          label="E-mail do Responsável"
          placeholder="seu.nome@empresa.com.br"
          autoComplete="username"
          {...register('email')}
          error={errors.email?.message}
          required
        />

        {/* Telefone */}
        <Input
          label="Telefone Direto"
          placeholder="(00) 0000-0000"
          {...register('phone')}
          onChange={(e) => handlePhoneChange('phone', e.target.value)}
          error={errors.phone?.message}
          required
        />

        {/* WhatsApp do Responsável */}
        <Input
          label="WhatsApp do Responsável"
          placeholder="(00) 90000-0000"
          {...register('whatsapp')}
          onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
          error={errors.whatsapp?.message}
          required
        />
      </div>

      {/* Bloco de Criação de Senha */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
          <Lock className="h-4 w-4 text-orange-500" />
          <span>Senha de Acesso Comercial</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Senha */}
          <div className="relative space-y-1">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Senha"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Confirmação de Senha */}
          <div className="relative space-y-1">
            <Input
              type={showConfirm ? 'text' : 'password'}
              label="Confirmar Senha"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Indicador de Força de Senha */}
        {passwordVal && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Força da senha:</span>
              <span className="font-bold">{passwordStrength.label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Exigência: 8+ caracteres, maiúscula, minúscula, número e caractere especial.
            </p>
          </div>
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
