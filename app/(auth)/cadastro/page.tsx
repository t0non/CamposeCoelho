import type { Metadata } from 'next'
import { RegistrationWizard } from '@/components/registration/registration-wizard'

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
    <div className="bg-slate-50 min-h-screen">
      <RegistrationWizard />
    </div>
  )
}
