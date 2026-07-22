'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/error-message'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error || !authData.user) {
      if (error?.message.includes('Invalid login credentials')) {
        setServerError('E-mail ou senha incorretos.')
      } else if (error?.message.includes('Email not confirmed')) {
        setServerError('Confirme seu e-mail antes de entrar.')
      } else {
        setServerError('Erro ao fazer login. Tente novamente.')
      }
      return
    }

    // Buscar perfil e status de empresa para redirecionamento correto
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', authData.user.id)
      .single()

    const profile = profileData as Pick<ProfileRow, 'role' | 'company_id'> | null

    router.refresh()

    if (profile?.role === 'admin' || profile?.role === 'seller') {
      router.push('/admin')
      return
    }

    if (profile?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('status')
        .eq('id', profile.company_id)
        .single()

      const company = companyData as Pick<CompanyRow, 'status'> | null

      if (company?.status === 'pending') {
        router.push('/conta-pendente')
        return
      }
      if (company?.status === 'rejected' || company?.status === 'suspended') {
        router.push('/conta-recusada')
        return
      }
    }

    router.push('/minha-conta')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <ErrorMessage message={serverError} />}

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        {...register('email')}
        error={errors.email?.message}
      />

      <div>
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          {...register('password')}
          error={errors.password?.message}
        />
        <div className="mt-1 text-right">
          <Link
            href="/recuperar-senha"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>

      <Button type="submit" loading={isSubmitting} fullWidth>
        Entrar
      </Button>

      <p className="text-center text-sm text-gray-500">
        Não tem cadastro?{' '}
        <Link href="/cadastro" className="text-blue-600 hover:underline font-medium">
          Cadastre sua empresa
        </Link>
      </p>
    </form>
  )
}
