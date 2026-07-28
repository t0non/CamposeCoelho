import { z } from 'zod'
import { validateCNPJ, validateCPF } from '@/lib/utils/masks'

// 1. Schema da Empresa
export const companyStepSchema = z
  .object({
    cnpj: z
      .string()
      .min(1, 'CNPJ é obrigatório.')
      .refine((val) => validateCNPJ(val), 'CNPJ inválido (verifique os dígitos).'),
    companyName: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres.'),
    tradingName: z.string().min(2, 'Nome fantasia é obrigatório.'),
    stateRegistration: z.string().optional(),
    isStateRegistrationExempt: z.boolean().optional(),
    segment: z.string().min(1, 'Selecione o segmento de atuação.'),
    businessType: z.string().min(1, 'Selecione o tipo de negócio.'),
    employeeCount: z.string().min(1, 'Selecione a faixa de funcionários.'),
    phone: z.string().min(10, 'Telefone comercial inválido.'),
    whatsapp: z.string().min(10, 'WhatsApp comercial inválido.'),
    email: z.string().email('E-mail comercial inválido.'),
    website: z.string().url('URL inválida.').optional().or(z.literal('')),
    foundationYear: z.string().regex(/^\d{4}$/, 'Ano inválido.').optional().or(z.literal('')),
  })
  .refine(
    (data) => data.isStateRegistrationExempt || (data.stateRegistration && data.stateRegistration.trim().length > 0),
    {
      message: 'Informe a Inscrição Estadual ou marque "Isento".',
      path: ['stateRegistration'],
    },
  )

export type CompanyStepFormValues = z.infer<typeof companyStepSchema>

// 2. Schema do Responsável
export const responsibleStepSchema = z
  .object({
    fullName: z.string().min(3, 'Nome completo é obrigatório.'),
    cpf: z
      .string()
      .min(1, 'CPF é obrigatório.')
      .refine((val) => validateCPF(val), 'CPF inválido (verifique os dígitos).'),
    role: z.string().min(1, 'Selecione o cargo.'),
    department: z.string().optional(),
    email: z.string().email('E-mail pessoal/corporativo inválido.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    whatsapp: z.string().min(10, 'WhatsApp inválido.'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres.')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula.')
      .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula.')
      .regex(/[0-9]/, 'Deve conter pelo menos um número.')
      .regex(/[^A-Za-z0-9]/, 'Deve conter pelo menos um caractere especial.'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

export type ResponsibleStepFormValues = z.infer<typeof responsibleStepSchema>

// 3. Schema de Endereço
export const addressSchema = z.object({
  cep: z.string().min(8, 'CEP inválido (8 dígitos).'),
  street: z.string().min(3, 'Logradouro é obrigatório.'),
  number: z.string().min(1, 'Número é obrigatório.'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório.'),
  city: z.string().min(2, 'Cidade é obrigatória.'),
  state: z.string().length(2, 'UF inválida (2 letras).'),
  referencePoint: z.string().optional(),
})

// 4. Schema do Conjunto de Endereços
export const addressesStepSchema = z.object({
  fiscal: addressSchema,
  shipping: addressSchema,
  isShippingSameAsFiscal: z.boolean().optional(),
  billing: addressSchema,
  isBillingSameAsFiscal: z.boolean().optional(),
})

export type AddressesStepFormValues = z.infer<typeof addressesStepSchema>

// 5. Schema dos Interesses
export const commercialInterestsStepSchema = z.object({
  categories: z.array(z.string()).min(1, 'Selecione pelo menos uma categoria de interesse.'),
  mainProducts: z.string().optional(),
  purchaseFrequency: z.string().min(1, 'Selecione a frequência estimada de compra.'),
  averageOrderValue: z.string().min(1, 'Selecione a faixa média de valor.'),
  storeCount: z.string().min(1, 'Informe o número de lojas.'),
  operatingStates: z.array(z.string()).min(1, 'Selecione pelo menos um estado de atuação.'),
  salesChannel: z.string().min(1, 'Selecione o canal principal de vendas.'),
  howDidYouHear: z.string().min(1, 'Informe como nos conheceu.'),
  notes: z.string().optional(),
})

export type CommercialInterestsStepFormValues = z.infer<typeof commercialInterestsStepSchema>

// 6. Schema dos Consentimentos
export const consentsStepSchema = z.object({
  termsOfUse: z.boolean().refine((val) => val === true, 'Aceite os Termos de Uso.'),
  privacyPolicy: z.boolean().refine((val) => val === true, 'Aceite a Política de Privacidade.'),
  lgpdDataProcessing: z
    .boolean()
    .refine((val) => val === true, 'Autorize o tratamento dos dados cadastrais.'),
  declarationOfTruth: z
    .boolean()
    .refine((val) => val === true, 'Declare que as informações são verdadeiras.'),
  receiveNewsletter: z.boolean().optional(),
  allowWhatsAppContact: z.boolean().optional(),
  allowEmailCampaigns: z.boolean().optional(),
})

export type ConsentsStepFormValues = z.infer<typeof consentsStepSchema>

/**
 * Calculador de força de senha (0 a 4).
 */
export function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  if (!password) return { score: 0, label: 'Muito fraca', color: 'bg-slate-200' }

  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score: 1, label: 'Fraca', color: 'bg-red-500' }
  if (score === 3) return { score: 2, label: 'Média', color: 'bg-amber-500' }
  if (score === 3) return { score: 2, label: 'Forte', color: 'bg-blue-500' }
  return { score: 4, label: 'Excelente', color: 'bg-green-600' }
}

// 7. Schema Unificado (Para Formulário Contínuo)
export const fullRegistrationSchema = z.object({
  company: companyStepSchema,
  responsible: responsibleStepSchema,
  addresses: addressesStepSchema,
  documents: z.array(z.unknown()).optional(), // The file upload logic handles this manually in the component for now or via a specific schema
  interests: commercialInterestsStepSchema,
  consents: consentsStepSchema,
})

export type FullRegistrationFormValues = z.infer<typeof fullRegistrationSchema>
