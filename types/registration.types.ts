export interface CompanyData {
  cnpj: string
  companyName: string // Razão Social
  tradingName: string // Nome Fantasia
  stateRegistration: string // Inscrição Estadual
  isStateRegistrationExempt: boolean
  segment: string
  businessType: string
  employeeCount: string
  phone: string
  whatsapp: string
  email: string
  website?: string
  foundationYear?: string
}

export interface ResponsibleData {
  fullName: string
  cpf: string
  role: string
  department?: string
  email: string
  phone: string
  whatsapp: string
  password?: string
  confirmPassword?: string
}

export interface AddressData {
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  referencePoint?: string
}

export interface RegistrationAddresses {
  fiscal: AddressData
  shipping: AddressData
  isShippingSameAsFiscal: boolean
  billing: AddressData
  isBillingSameAsFiscal: boolean
}

export interface DocumentItem {
  id: string
  category: 'contrato_social' | 'cartao_cnpj' | 'doc_responsavel' | 'comprovante_endereco' | 'inscricao_estadual' | 'outros'
  fileName: string
  fileSize: number
  fileType: string
}

export interface CommercialInterestsData {
  categories: string[]
  mainProducts?: string
  purchaseFrequency: string
  averageOrderValue: string
  storeCount: string
  operatingStates: string[]
  salesChannel: string
  howDidYouHear: string
  notes?: string
}

export interface ConsentData {
  termsOfUse: boolean
  privacyPolicy: boolean
  lgpdDataProcessing: boolean
  declarationOfTruth: boolean
  receiveNewsletter: boolean
  allowWhatsAppContact: boolean
  allowEmailCampaigns: boolean
}

export interface FullRegistrationData {
  company: CompanyData
  responsible: ResponsibleData
  addresses: RegistrationAddresses
  documents: DocumentItem[]
  interests: CommercialInterestsData
  consents: ConsentData
}

export interface RegistrationSubmitResult {
  success: boolean
  mode: 'demo' | 'live'
  protocol: string
  submittedAt: string
  message: string
  error?: string
}
