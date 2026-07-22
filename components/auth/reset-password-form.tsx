'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/error-message'

type RecoveryState = 'loading' | 'ready' | 'invalid' | 'success'

/**
 * Formulário de definição de nova senha, exibido após o usuário clicar
 * no link de recuperação enviado por e-mail.
 *
 * Detecta a sessão de recovery via onAuthStateChange com evento PASSWORD_RECOVERY.
 * Chama supabase.auth.updateUser({ password }) para efetuar a troca.
 */
export function ResetPasswordForm() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('loading')
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Escuta o evento PASSWORD_RECOVERY para confirmar sessão válida
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Sessão de recovery válida — formulário pronto
        setRecoveryState('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // Usuário já autenticado por outro meio — também aceita
        setRecoveryState('ready')
      }
    })

    // Verificar se já existe sessão válida (caso o usuário recarregue a página)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRecoveryState('ready')
      } else {
        // Se não veio evento em 3s e não tem sessão, link provavelmente expirou
        const timer = setTimeout(() => {
          setRecoveryState((current) => {
            if (current === 'loading') return 'invalid'
            return current
          })
        }, 3000)
        return () => clearTimeout(timer)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null)

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      if (error.message.toLowerCase().includes('same password')) {
        setServerError('A nova senha não pode ser igual à senha atual.')
      } else if (error.message.toLowerCase().includes('weak password')) {
        setServerError('Senha muito fraca. Use ao menos 8 caracteres, uma maiúscula e um número.')
      } else if (
        error.message.toLowerCase().includes('session') ||
        error.message.toLowerCase().includes('expired')
      ) {
        setRecoveryState('invalid')
      } else {
        setServerError('Erro ao atualizar a senha. Tente novamente.')
      }
      return
    }

    // Encerra a sessão de recovery após a troca
    await supabase.auth.signOut()
    setRecoveryState('success')
  }

  // ──────────────────────────────────────────────
  // Estados de interface
  // ──────────────────────────────────────────────

  if (recoveryState === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Verificando link de recuperação…</p>
      </div>
    )
  }

  if (recoveryState === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Link inválido ou expirado</p>
          <p className="mt-1 text-sm text-gray-500">
            Este link de recuperação não é mais válido. Solicite um novo link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/recuperar-senha')}
          className="text-sm text-blue-600 hover:underline"
        >
          Solicitar novo link
        </button>
      </div>
    )
  }

  if (recoveryState === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Senha atualizada!</p>
          <p className="mt-1 text-sm text-gray-500">
            Sua senha foi alterada com sucesso. Você pode entrar com a nova senha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ir para o login
        </button>
      </div>
    )
  }

  // recoveryState === 'ready'
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <ErrorMessage message={serverError} />}

      <div className="relative">
        <Input
          label="Nova senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres, uma letra maiúscula e um número."
          {...register('password')}
          error={errors.password?.message}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative">
        <Input
          label="Confirmar nova senha"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          required
          {...register('confirm_password')}
          error={errors.confirm_password?.message}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowConfirm((v) => !v)}
          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
        >
          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Button type="submit" loading={isSubmitting} fullWidth>
        Definir nova senha
      </Button>
    </form>
  )
}
