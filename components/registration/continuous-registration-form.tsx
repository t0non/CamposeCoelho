'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UploadCloud, X, FileText } from 'lucide-react'

import { fullRegistrationSchema, type FullRegistrationFormValues } from '@/lib/validations/registration'
import { maskCNPJ, maskPhone, maskCPF, maskCEP } from '@/lib/utils/masks'
import { submitBusinessRegistration } from '@/lib/services/registration-service'
import type { FullRegistrationData } from '@/types/registration.types'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

const INTEREST_CATEGORIES = [
  'Informática', 'Festas', 'Acessórios de uso pessoal', 'Pelúcia',
  'Times de futebol', 'Eletro eletrônicos', 'Brinquedos', 'Automóveis',
  'Perfumaria e beleza', 'Papelaria', "Pet's", 'Esportes e lazer',
  'Decoração', 'Utilidade doméstica', 'Bebês e cia', 'Ferramentas, jardinagem e bricolagem',
]

interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  category: 'contrato_social' | 'doc_responsavel'
}

export function ContinuousRegistrationForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Document upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const contratoRef = useRef<HTMLInputElement>(null)
  const docIdRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FullRegistrationFormValues>({
    resolver: zodResolver(fullRegistrationSchema),
    defaultValues: {
      company: { isStateRegistrationExempt: false },
      addresses: { isShippingSameAsFiscal: true, isBillingSameAsFiscal: true },
      interests: { categories: [], operatingStates: [] },
      consents: {
        termsOfUse: false,
        privacyPolicy: false,
        lgpdDataProcessing: false,
        declarationOfTruth: false,
      },
    },
  })

  const isStateRegistrationExempt = watch('company.isStateRegistrationExempt')

  const onSubmit = async (data: FullRegistrationFormValues) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitBusinessRegistration(data as FullRegistrationData)
      if (result.success) {
        router.push(`/cadastro/sucesso?protocol=${encodeURIComponent(result.protocol)}`)
      } else {
        setSubmitError(result.error || 'Erro ao processar o cadastro. Tente novamente.')
        setIsSubmitting(false)
      }
    } catch {
      setSubmitError('Ocorreu um erro inesperado. Tente novamente mais tarde.')
      setIsSubmitting(false)
    }
  }

  const handleMaskChange = (field: any, val: string, maskFn: (v: string) => string) => {
    setValue(field, maskFn(val), { shouldValidate: true })
  }

  const handleFileUpload = (file: File, category: UploadedFile['category']) => {
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      alert(`O arquivo "${file.name}" excede o limite de 2MB.`)
      return
    }
    const newFile: UploadedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName: file.name,
      fileSize: file.size,
      category,
    }
    setUploadedFiles((prev) => [...prev, newFile])
  }

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const contratoFiles = uploadedFiles.filter((f) => f.category === 'contrato_social')
  const docIdFiles = uploadedFiles.filter((f) => f.category === 'doc_responsavel')

  return (
    <div className="max-w-[1200px] mx-auto bg-white p-6 sm:p-10 shadow-sm border border-gray-200 rounded-lg my-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1b3b6f]">Cadastre-se</h1>
        <p className="text-gray-600 mt-2">
          Para efetuar seu cadastro, basta preencher o formulário abaixo com os seus dados.
        </p>
        <p className="text-sm text-red-600 mt-1 italic">
          Atenção: Os campos marcados com * são de preenchimento obrigatório.
        </p>
        <p className="text-sm text-gray-600 mt-4">
          Cadastro exclusivo para clientes com CNPJ e Inscrição Estadual.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {/* ═══════════════ 1. Cadastro da Empresa ═══════════════ */}
        <section>
          <h2 className="text-xl font-bold text-[#1b3b6f] mb-4 border-b pb-2">
            Cadastro da Empresa
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="CNPJ *"
              placeholder="00.000.000/0001-00"
              {...register('company.cnpj')}
              onChange={(e) => handleMaskChange('company.cnpj', e.target.value, maskCNPJ)}
              error={errors.company?.cnpj?.message}
            />
            <Input
              label="Nome Fantasia *"
              {...register('company.tradingName')}
              error={errors.company?.tradingName?.message}
            />
            <Input
              label="Razão Social *"
              {...register('company.companyName')}
              error={errors.company?.companyName?.message}
            />
            <Input
              label="E-mail *"
              type="email"
              {...register('company.email')}
              error={errors.company?.email?.message}
            />

            <div className="space-y-2">
              <Input
                label="Inscrição Estadual"
                disabled={isStateRegistrationExempt}
                {...register('company.stateRegistration')}
                error={errors.company?.stateRegistration?.message}
              />
              <Checkbox
                label="Isento de Inscrição Estadual"
                checked={isStateRegistrationExempt}
                onChange={(e) => {
                  setValue('company.isStateRegistrationExempt', e.target.checked)
                  if (e.target.checked) setValue('company.stateRegistration', '')
                }}
              />
            </div>

            <Input
              label="Telefone *"
              {...register('company.phone')}
              onChange={(e) => handleMaskChange('company.phone', e.target.value, maskPhone)}
              error={errors.company?.phone?.message}
            />

            <Select
              label="Segmento de Atuação *"
              options={[
                { label: 'Supermercado / Mercearia', value: 'supermercado' },
                { label: 'Loja de Utilidades Domésticas', value: 'utilidades' },
                { label: 'Papelaria & Escritório', value: 'papelaria' },
                { label: 'Loja de Brinquedos', value: 'brinquedos' },
                { label: 'Distribuidor / Atacadista', value: 'distribuidor' },
                { label: 'Outro Segmento', value: 'outro' },
              ]}
              {...register('company.segment')}
              error={errors.company?.segment?.message}
            />

            <Select
              label="Tipo de Negócio *"
              options={[
                { label: 'Matriz', value: 'matriz' },
                { label: 'Filial', value: 'filial' },
                { label: 'MEI', value: 'mei' },
                { label: 'ME / EPP', value: 'me_epp' },
              ]}
              {...register('company.businessType')}
              error={errors.company?.businessType?.message}
            />

            <Select
              label="Número de funcionários *"
              options={[
                { label: '1 a 5', value: '1-5' },
                { label: '6 a 15', value: '6-15' },
                { label: '16 a 50', value: '16-50' },
                { label: 'Mais de 50', value: '50+' },
              ]}
              {...register('company.employeeCount')}
              error={errors.company?.employeeCount?.message}
            />

            <Input
              label="WhatsApp"
              {...register('company.whatsapp')}
              onChange={(e) => handleMaskChange('company.whatsapp', e.target.value, maskPhone)}
              error={errors.company?.whatsapp?.message}
            />
          </div>
        </section>

        {/* ═══════════════ 2. Documentos ═══════════════ */}
        <section>
          <h2 className="text-xl font-bold text-[#1b3b6f] mb-4 border-b pb-2">Documentos</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contrato Social */}
            <div>
              <p className="text-[#1b3b6f] text-sm font-semibold mb-2">
                *Inserir contrato social
              </p>
              <label
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileUpload(file, 'contrato_social')
                }}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <UploadCloud className="w-10 h-10 mb-2 text-[#1b3b6f]" />
                  <p className="text-sm text-gray-500">
                    Arraste e solte seus arquivos ou{' '}
                    <span className="text-[#1b3b6f] font-semibold">Clique para localizar</span>
                  </p>
                </div>
                <input
                  ref={contratoRef}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.doc,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'contrato_social')
                    e.target.value = ''
                  }}
                />
              </label>
              <div className="flex justify-between items-center mt-2 text-[11px] text-gray-400">
                <span>Formatos suportados: PNG, JPG, PDF, DOC, XLS, XLSX</span>
                <span>Tamanho máximo: 2MB</span>
              </div>
              {/* Lista de arquivos do contrato social */}
              {contratoFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {contratoFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#1b3b6f] shrink-0" />
                        <span className="truncate text-gray-800">{f.fileName}</span>
                        <span className="text-gray-400 text-xs shrink-0">
                          ({(f.fileSize / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                        aria-label="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documento de Identidade do Responsável */}
            <div>
              <p className="text-[#1b3b6f] text-sm font-semibold mb-2">
                *Inserir documento de identidade da pessoa responsável
              </p>
              <label
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileUpload(file, 'doc_responsavel')
                }}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <UploadCloud className="w-10 h-10 mb-2 text-[#1b3b6f]" />
                  <p className="text-sm text-gray-500">
                    Arraste e solte seus arquivos ou{' '}
                    <span className="text-[#1b3b6f] font-semibold">Clique para localizar</span>
                  </p>
                </div>
                <input
                  ref={docIdRef}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.doc,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'doc_responsavel')
                    e.target.value = ''
                  }}
                />
              </label>
              <div className="flex justify-between items-center mt-2 text-[11px] text-gray-400">
                <span>Formatos suportados: PNG, JPG, PDF, DOC, XLS, XLSX</span>
                <span>Tamanho máximo: 2MB</span>
              </div>
              {/* Lista de arquivos do documento de identidade */}
              {docIdFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {docIdFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#1b3b6f] shrink-0" />
                        <span className="truncate text-gray-800">{f.fileName}</span>
                        <span className="text-gray-400 text-xs shrink-0">
                          ({(f.fileSize / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                        aria-label="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════ 3. Áreas de interesse ═══════════════ */}
        <section>
          <h2 className="text-xl font-bold text-[#1b3b6f] mb-4 border-b pb-2">
            Áreas de interesse
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {INTEREST_CATEGORIES.map((category) => (
              <label
                key={category}
                className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={category}
                  {...register('interests.categories')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
          {errors.interests?.categories?.message && (
            <p className="text-red-500 text-xs mt-2">{errors.interests.categories.message}</p>
          )}

          <div className="grid sm:grid-cols-4 gap-4 mt-6">
            <Select
              label="Canal de Vendas *"
              options={[
                { label: 'Loja Física', value: 'fisica' },
                { label: 'Online', value: 'online' },
                { label: 'Ambos', value: 'ambos' },
              ]}
              {...register('interests.salesChannel')}
              error={errors.interests?.salesChannel?.message}
            />
            <Select
              label="Frequência de Compra *"
              options={[
                { label: 'Semanal', value: 'semanal' },
                { label: 'Quinzenal', value: 'quinzenal' },
                { label: 'Mensal', value: 'mensal' },
              ]}
              {...register('interests.purchaseFrequency')}
              error={errors.interests?.purchaseFrequency?.message}
            />
            <Select
              label="Volume Médio *"
              options={[
                { label: 'Até R$ 5.000', value: 'ate_5k' },
                { label: 'R$ 5.000 a R$ 20.000', value: '5k_20k' },
                { label: 'Acima de R$ 20.000', value: 'acima_20k' },
              ]}
              {...register('interests.averageOrderValue')}
              error={errors.interests?.averageOrderValue?.message}
            />
            <Select
              label="Como nos conheceu? *"
              options={[
                { label: 'Google', value: 'google' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'Indicação', value: 'indicacao' },
                { label: 'Outro', value: 'outro' },
              ]}
              {...register('interests.howDidYouHear')}
              error={errors.interests?.howDidYouHear?.message}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Select
              label="Número de Lojas *"
              options={[
                { label: '1 loja', value: '1' },
                { label: '2 a 5 lojas', value: '2-5' },
                { label: 'Mais de 5', value: '5+' },
              ]}
              {...register('interests.storeCount')}
              error={errors.interests?.storeCount?.message}
            />
            <div>
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  value="SP"
                  {...register('interests.operatingStates')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Estado de Atuação: São Paulo (SP)</span>
              </label>
              {errors.interests?.operatingStates?.message && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.interests.operatingStates.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════ 4. Endereço ═══════════════ */}
        <section>
          <h2 className="text-xl font-bold text-[#1b3b6f] mb-4 border-b pb-2">Endereço</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <Input
              label="CEP *"
              {...register('addresses.fiscal.cep')}
              onChange={(e) =>
                handleMaskChange('addresses.fiscal.cep', e.target.value, maskCEP)
              }
              error={errors.addresses?.fiscal?.cep?.message}
            />
            <div className="sm:col-span-2">
              <Input
                label="Endereço *"
                {...register('addresses.fiscal.street')}
                error={errors.addresses?.fiscal?.street?.message}
              />
            </div>
            <Input
              label="Número *"
              {...register('addresses.fiscal.number')}
              error={errors.addresses?.fiscal?.number?.message}
            />

            <Input
              label="Complemento"
              {...register('addresses.fiscal.complement')}
            />
            <Input
              label="Bairro *"
              {...register('addresses.fiscal.neighborhood')}
              error={errors.addresses?.fiscal?.neighborhood?.message}
            />
            <Input
              label="Cidade *"
              {...register('addresses.fiscal.city')}
              error={errors.addresses?.fiscal?.city?.message}
            />
            <Input
              label="Estado *"
              {...register('addresses.fiscal.state')}
              error={errors.addresses?.fiscal?.state?.message}
            />
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <p>
              As informações relativas à razão social e endereço são as mesmas da base de dados da
              Receita Federal para o CNPJ informado. Aceito receber informações de acordo com a
              Política de Segurança (Lei Geral de Proteção de Dados).
            </p>
          </div>
        </section>

        {/* ═══════════════ 5. Contato Responsável ═══════════════ */}
        <section>
          <h2 className="text-xl font-bold text-[#1b3b6f] mb-4 border-b pb-2">
            Contato Responsável
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Nome Completo *"
              {...register('responsible.fullName')}
              error={errors.responsible?.fullName?.message}
            />
            <Input
              label="CPF *"
              {...register('responsible.cpf')}
              onChange={(e) => handleMaskChange('responsible.cpf', e.target.value, maskCPF)}
              error={errors.responsible?.cpf?.message}
            />
            <Select
              label="Cargo *"
              options={[
                { label: 'Proprietário(a)', value: 'proprietario' },
                { label: 'Comprador(a)', value: 'comprador' },
                { label: 'Gerente', value: 'gerente' },
                { label: 'Outro', value: 'outro' },
              ]}
              {...register('responsible.role')}
              error={errors.responsible?.role?.message}
            />

            <Input
              label="E-mail *"
              type="email"
              {...register('responsible.email')}
              error={errors.responsible?.email?.message}
            />
            <Input
              label="Telefone *"
              {...register('responsible.phone')}
              onChange={(e) => handleMaskChange('responsible.phone', e.target.value, maskPhone)}
              error={errors.responsible?.phone?.message}
            />
            <Input
              label="WhatsApp *"
              {...register('responsible.whatsapp')}
              onChange={(e) =>
                handleMaskChange('responsible.whatsapp', e.target.value, maskPhone)
              }
              error={errors.responsible?.whatsapp?.message}
            />

            <Input
              label="Senha *"
              type="password"
              {...register('responsible.password')}
              error={errors.responsible?.password?.message}
            />
            <Input
              label="Confirmar Senha *"
              type="password"
              {...register('responsible.confirmPassword')}
              error={errors.responsible?.confirmPassword?.message}
            />
          </div>
        </section>

        {/* ═══════════════ 6. Termos e Condições ═══════════════ */}
        <section className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h2 className="font-semibold text-sm mb-3">Termos e Condições</h2>
          <div className="space-y-3">
            <Controller
              name="consents.termsOfUse"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label={
                    <span className="text-sm">
                      Aceito os <strong>Termos de Uso</strong> *
                    </span>
                  }
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="consents.privacyPolicy"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label={
                    <span className="text-sm">
                      Aceito a <strong>Política de Privacidade</strong> *
                    </span>
                  }
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="consents.lgpdDataProcessing"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label={
                    <span className="text-sm">
                      Autorizo o tratamento de dados de acordo com a LGPD *
                    </span>
                  }
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="consents.declarationOfTruth"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label={
                    <span className="text-sm">
                      Declaro que todas as informações prestadas são verdadeiras *
                    </span>
                  }
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div className="text-red-500 text-xs">
              {errors.consents?.termsOfUse?.message ||
                errors.consents?.privacyPolicy?.message ||
                errors.consents?.lgpdDataProcessing?.message ||
                errors.consents?.declarationOfTruth?.message}
            </div>
          </div>
        </section>

        {/* ═══════════════ Botão de Submit ═══════════════ */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#1b3b6f] hover:bg-[#122a52] text-white px-12 py-6 text-lg font-bold rounded-md w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                PROCESSANDO...
              </>
            ) : (
              'CADASTRAR'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
