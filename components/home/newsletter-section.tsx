'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, CheckCircle2, Loader2, Send } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const newsletterSchema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  email: z.string().email('E-mail inválido.'),
  whatsapp: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, 'Aceite a política de privacidade.'),
})

type NewsletterInput = z.infer<typeof newsletterSchema>

export function NewsletterSection() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      terms: true,
    },
  })

  const onSubmit = async (data: NewsletterInput) => {
    // Simulação de envio da newsletter (preparado para futura gravação em newsletter_leads)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSuccess(true)
    reset()
  }

  return (
    <section className="py-12 bg-navy-900 text-white select-none">
      <Container>
        <div className="rounded-3xl bg-navy-800 border border-navy-700 p-8 sm:p-12">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo - Título & Descrição */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Receba Novidades & Oportunidades
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Cadastre-se para acompanhar lançamentos de produtos, campanhas de temporada e promoções de atacado.
              </p>
            </div>

            {/* Lado Direito - Formulário */}
            <div className="lg:col-span-7">
              {success ? (
                <div className="flex items-center gap-3 rounded-2xl bg-green-500/20 border border-green-500/40 p-6 text-green-300">
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-green-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Inscrição realizada com sucesso!</h3>
                    <p className="text-xs text-green-200 mt-0.5">
                      Você receberá nossas novidades comerciais em primeira mão.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      placeholder="Seu nome"
                      {...register('name')}
                      error={errors.name?.message}
                      className="bg-navy-900 border-navy-700 text-white placeholder:text-slate-500"
                    />
                    <Input
                      type="email"
                      placeholder="Seu e-mail empresarial"
                      {...register('email')}
                      error={errors.email?.message}
                      className="bg-navy-900 border-navy-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="text-slate-300">
                      <Checkbox
                        label="Concordo em receber novidades comerciais por e-mail"
                        {...register('terms')}
                        className="border-navy-600 bg-navy-900"
                      />
                      {errors.terms && (
                        <p className="text-xs text-red-400 mt-1">{errors.terms.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="accent"
                      loading={isSubmitting}
                      className="w-full sm:w-auto px-8"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Inscrever-se
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
