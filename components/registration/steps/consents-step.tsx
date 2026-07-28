'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { consentsStepSchema } from '@/lib/validations/registration'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import type { ConsentData } from '@/types/registration.types'

interface ConsentsStepProps {
  initialValues?: Partial<ConsentData>
  onSubmit: (data: ConsentData) => void
  onBack: () => void
}

export function ConsentsStep({ initialValues, onSubmit, onBack }: ConsentsStepProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(consentsStepSchema),
    defaultValues: {
      termsOfUse: initialValues?.termsOfUse ?? false,
      privacyPolicy: initialValues?.privacyPolicy ?? false,
      lgpdDataProcessing: initialValues?.lgpdDataProcessing ?? false,
      declarationOfTruth: initialValues?.declarationOfTruth ?? false,
      receiveNewsletter: initialValues?.receiveNewsletter ?? false,
      allowWhatsAppContact: initialValues?.allowWhatsAppContact ?? false,
      allowEmailCampaigns: initialValues?.allowEmailCampaigns ?? false,
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as ConsentData))} noValidate className="space-y-6">
      <div className="border-b border-slate-200 pb-3 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Etapa 6 — Termos e Consentimentos</h2>
        <p className="text-xs text-slate-500">
          Revise e aceite os termos comerciais e de proteção de dados para prosseguir com a solicitação de cadastro.
        </p>
      </div>

      {/* Caixa Informativa LGPD em linguagem simples */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-1.5 text-xs text-blue-900">
        <div className="flex items-center gap-2 font-bold text-blue-800">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <span>Proteção de Dados Pessoais e LGPD</span>
        </div>
        <p className="text-blue-700 leading-relaxed">
          Seus dados serão utilizados estritamente para análise cadastral, atendimento comercial, prevenção à fraude e segurança da operação atacadista. Você poderá solicitar atualização ou exclusão de acordo com a legislação aplicável.
        </p>
      </div>

      {/* 1. Consentimentos Obrigatórios */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Declarações Obrigatórias *
        </h3>

        <div className="space-y-3 text-xs text-slate-700">
          <div>
            <Checkbox
              label={
                <span>
                  Li e aceito os{' '}
                  <Link href="/termos-de-uso" target="_blank" className="font-bold text-orange-600 hover:underline">
                    Termos de Uso Comercial
                  </Link>
                </span>
              }
              checked={watch('termsOfUse')}
              onChange={(e) => setValue('termsOfUse', e.target.checked, { shouldValidate: true })}
            />
            {errors.termsOfUse && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.termsOfUse.message}</p>
            )}
          </div>

          <div>
            <Checkbox
              label={
                <span>
                  Li e aceito a{' '}
                  <Link href="/politica-de-privacidade" target="_blank" className="font-bold text-orange-600 hover:underline">
                    Política de Privacidade e Proteção de Dados
                  </Link>
                </span>
              }
              checked={watch('privacyPolicy')}
              onChange={(e) => setValue('privacyPolicy', e.target.checked, { shouldValidate: true })}
            />
            {errors.privacyPolicy && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.privacyPolicy.message}</p>
            )}
          </div>

          <div>
            <Checkbox
              label="Autorizo o tratamento dos dados da empresa e do responsável para fins de análise cadastral e consulta de crédito comercial."
              checked={watch('lgpdDataProcessing')}
              onChange={(e) => setValue('lgpdDataProcessing', e.target.checked, { shouldValidate: true })}
            />
            {errors.lgpdDataProcessing && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.lgpdDataProcessing.message}</p>
            )}
          </div>

          <div>
            <Checkbox
              label="Declaro sob as penas da lei que todas as informações fornecidas neste cadastro são autênticas e verdadeiras."
              checked={watch('declarationOfTruth')}
              onChange={(e) => setValue('declarationOfTruth', e.target.checked, { shouldValidate: true })}
            />
            {errors.declarationOfTruth && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.declarationOfTruth.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Consentimentos Opcionais */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Comunicações Comerciais (Opcional)
        </h3>

        <div className="space-y-3 text-xs text-slate-700">
          <Checkbox
            label="Desejo receber boletins e avisos de novos lançamentos em estoque."
            checked={watch('receiveNewsletter')}
            onChange={(e) => setValue('receiveNewsletter', e.target.checked)}
          />

          <Checkbox
            label="Aceito receber ofertas e suporte direto da equipe comercial via WhatsApp."
            checked={watch('allowWhatsAppContact')}
            onChange={(e) => setValue('allowWhatsAppContact', e.target.checked)}
          />

          <Checkbox
            label="Aceito receber campanhas promocionais e cupons de desconto por e-mail."
            checked={watch('allowEmailCampaigns')}
            onChange={(e) => setValue('allowEmailCampaigns', e.target.checked)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Voltar</span>
        </Button>
        <Button type="submit" variant="accent" className="px-8 font-bold">
          <span>Avançar para Revisão</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </form>
  )
}
