'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/ui/container'
import { RegistrationProgress } from './registration-progress'
import { CompanyStep } from './steps/company-step'
import { ResponsibleStep } from './steps/responsible-step'
import { AddressesStep } from './steps/addresses-step'
import { DocumentsStep } from './steps/documents-step'
import { CommercialInterestsStep } from './steps/commercial-interests-step'
import { ConsentsStep } from './steps/consents-step'
import { RegistrationReview } from './steps/registration-review'

import { submitBusinessRegistration } from '@/lib/services/registration-service'
import type { FullRegistrationData, CompanyData, ResponsibleData, RegistrationAddresses, DocumentItem, CommercialInterestsData, ConsentData } from '@/types/registration.types'

const STEP_TITLES = [
  'Empresa',
  'Responsável',
  'Endereços',
  'Documentos',
  'Interesses',
  'Consentimentos',
  'Revisão',
]

export function RegistrationWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Estado consolidado mantido apenas na memória React do cliente (SEM localStorage para dados sensíveis)
  const [formData, setFormData] = useState<Partial<FullRegistrationData>>({
    documents: [],
  })

  const updateCompany = (data: CompanyData) => {
    setFormData((prev) => ({ ...prev, company: data }))
    setCurrentStep(2)
  }

  const updateResponsible = (data: ResponsibleData) => {
    setFormData((prev) => ({ ...prev, responsible: data }))
    setCurrentStep(3)
  }

  const updateAddresses = (data: RegistrationAddresses) => {
    setFormData((prev) => ({ ...prev, addresses: data }))
    setCurrentStep(4)
  }

  const updateDocuments = (docs: DocumentItem[]) => {
    setFormData((prev) => ({ ...prev, documents: docs }))
    setCurrentStep(5)
  }

  const updateInterests = (data: CommercialInterestsData) => {
    setFormData((prev) => ({ ...prev, interests: data }))
    setCurrentStep(6)
  }

  const updateConsents = (data: ConsentData) => {
    setFormData((prev) => ({ ...prev, consents: data }))
    setCurrentStep(7)
  }

  const handleFinalSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const fullData = formData as FullRegistrationData
      const result = await submitBusinessRegistration(fullData)

      if (result.success) {
        // Redireciona para a página de sucesso com o protocolo na URL pública
        router.push(`/cadastro/sucesso?protocol=${encodeURIComponent(result.protocol)}`)
      }
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="max-w-4xl space-y-8 py-8 min-h-screen">
      {/* Progresso do Wizard */}
      <RegistrationProgress
        currentStep={currentStep}
        totalSteps={7}
        stepTitles={STEP_TITLES}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* Renders das Etapas */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
        {currentStep === 1 && (
          <CompanyStep initialValues={formData.company} onSubmit={updateCompany} />
        )}

        {currentStep === 2 && (
          <ResponsibleStep
            initialValues={formData.responsible}
            onSubmit={updateResponsible}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <AddressesStep
            initialValues={formData.addresses}
            onSubmit={updateAddresses}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <DocumentsStep
            initialValues={formData.documents}
            onSubmit={updateDocuments}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <CommercialInterestsStep
            initialValues={formData.interests}
            onSubmit={updateInterests}
            onBack={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 6 && (
          <ConsentsStep
            initialValues={formData.consents}
            onSubmit={updateConsents}
            onBack={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 7 && formData.company && formData.responsible && formData.addresses && formData.interests && formData.consents && (
          <RegistrationReview
            data={formData as FullRegistrationData}
            onEditStep={(step) => setCurrentStep(step)}
            onSubmit={handleFinalSubmit}
            onBack={() => setCurrentStep(6)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </Container>
  )
}
