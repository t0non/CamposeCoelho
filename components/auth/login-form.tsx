'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/error-message'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']

/**
 * Sanitiza um caminho de redirect no cliente — espelho do safeRedirectPath() do servidor.
 */
function safeRedirectPath(
  path: string | null | undefined,
  fallback: string = '/',
): string {
  if (!path || typeof path !== 'string') return fallback
  if (path.trim() === '') return fallback
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(path)) return fallback
  if (path.startsWith('//')) return fallback
  if (!path.startsWith('/')) return fallback
  return path
}

/**
 * Verifica se o redirect param é permitido para o role/status do usuário.
 */
function isRedirectAllowedForRole(
  redirectPath: string,
  role: string,
  companyStatus: string | null,
): boolean {
  if (role === 'admin') return true
  if (role === 'seller') return !redirectPath.startsWith('/admin')
  if (role === 'customer') {
    if (
      companyStatus === 'pending' ||
      companyStatus === 'rejected' ||
      companyStatus === 'suspended'
    ) {
      return (
        redirectPath === '/conta-pendente' || redirectPath === '/conta-recusada'
      )
    }
    return (
      !redirectPath.startsWith('/admin') && !redirectPath.startsWith('/vendedor')
    )
  }
  return false
}

function LoginFormInner() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
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

    if (!profile) {
      setServerError('Erro de configuração no perfil. Contate o suporte.')
      await supabase.auth.signOut()
      return
    }

    const role = profile.role

    // Determinar destino padrão por role
    let defaultDestination: string
    let companyStatus: string | null = null

    if (role === 'admin') {
      defaultDestination = '/admin'
    } else if (role === 'seller') {
      defaultDestination = '/vendedor'
    } else {
      // customer — verificar status da empresa
      if (profile.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('status')
          .eq('id', profile.company_id)
          .single()

        companyStatus = (companyData as Pick<CompanyRow, 'status'> | null)?.status ?? null
      }

      if (companyStatus === 'approved') {
        defaultDestination = '/minha-conta'
      } else if (companyStatus === 'pending') {
        defaultDestination = '/conta-pendente'
      } else if (companyStatus === 'rejected' || companyStatus === 'suspended') {
        defaultDestination = '/conta-recusada'
      } else {
        defaultDestination = '/conta-pendente'
      }
    }

    // Verificar redirect param — somente se seguro e compatível com o role
    const redirectParam = searchParams.get('redirect')
    const safePath = safeRedirectPath(redirectParam)

    if (
      safePath !== '/' &&
      isRedirectAllowedForRole(safePath, role, companyStatus)
    ) {
      router.push(safePath)
      return
    }

    router.push(defaultDestination)
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
        <div className="relative">
          <Input
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            {...register('password')}
            error={errors.password?.message}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
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

export function LoginForm() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
      <LoginFormInner />
    </Suspense>
  )
}
