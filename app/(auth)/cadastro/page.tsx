import type { Metadata } from 'next'
import { ContinuousRegistrationForm } from '@/components/registration/continuous-registration-form'

export const metadata: Metadata = {
  title: 'Cadastro Empresarial B2B | Central Atacado',
  description:
    'Cadastre seu CNPJ e solicite aprovação comercial para liberar os preços de atacado e faturamento.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function CadastroPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <ContinuousRegistrationForm />
    </div>
  )
}
