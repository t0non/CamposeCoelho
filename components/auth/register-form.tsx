'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/error-message'
import { CheckCircle } from 'lucide-react'

/**
 * Formulário de cadastro B2B.
 * Submete via Server Action (a ser implementado).
 * Placeholder inicial para compilação e testes de rota.
 */
export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      cnpj: '',
      company_name: '',
      trade_name: '',
    },
  })

  // Server Action de registro será implementado na próxima etapa
  const onSubmit = async (_data: RegisterInput) => {
    setServerError(null)
    // TODO: Implementar Server Action de cadastro B2B
    // O cadastro exige: criar usuário no Supabase Auth + inserir profile + inserir company com status=pending
    setServerError('Cadastro não disponível nesta etapa. Em breve!')
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="font-semibold text-gray-800">Cadastro enviado!</p>
          <p className="mt-1 text-sm text-gray-500">
            Seu cadastro está em análise. Enviaremos um e-mail quando for
            aprovado.
          </p>
        </div>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Fazer login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && <ErrorMessage message={serverError} />}

      {/* Dados pessoais */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 w-full">
          Dados do responsável
        </legend>
        <Input
          label="Nome completo"
          required
          {...register('full_name')}
          error={errors.full_name?.message}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Telefone"
            type="tel"
            hint="Somente números"
            required
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres, 1 maiúscula e 1 número"
            {...register('password')}
            error={errors.password?.message}
          />
          <Input
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            required
            {...register('confirm_password')}
            error={errors.confirm_password?.message}
          />
        </div>
      </fieldset>

      {/* Dados da empresa */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 w-full">
          Dados da empresa
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="CNPJ"
            hint="Somente números"
            required
            {...register('cnpj')}
            error={errors.cnpj?.message}
          />
          <Input
            label="Inscrição Estadual"
            {...register('state_registration')}
            error={errors.state_registration?.message}
          />
        </div>
        <Input
          label="Razão Social"
          required
          {...register('company_name')}
          error={errors.company_name?.message}
        />
        <Input
          label="Nome Fantasia"
          {...register('trade_name')}
          error={errors.trade_name?.message}
        />
      </fieldset>

      <Button type="submit" loading={isSubmitting} fullWidth size="lg">
        Enviar cadastro para análise
      </Button>

      <p className="text-center text-sm text-gray-500">
        Já tem cadastro?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Fazer login
        </Link>
      </p>
    </form>
  )
}
