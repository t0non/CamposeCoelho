'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorMessage } from '@/components/ui/error-message'
import { CheckCircle } from 'lucide-react'

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/recuperar-senha?type=recovery`,
    })

    if (error) {
      setServerError('Erro ao enviar e-mail. Tente novamente.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="font-semibold text-gray-800">E-mail enviado!</p>
          <p className="mt-1 text-sm text-gray-500">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua
            senha.
          </p>
        </div>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <ErrorMessage message={serverError} />}

      <Input
        label="E-mail cadastrado"
        type="email"
        autoComplete="email"
        required
        hint="Enviaremos um link para redefinir sua senha."
        {...register('email')}
        error={errors.email?.message}
      />

      <Button type="submit" loading={isSubmitting} fullWidth>
        Enviar link de recuperação
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
