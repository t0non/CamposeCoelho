import { z } from 'zod'

export const addressSchema = z.object({
  label: z.string().min(1, 'Identificação é obrigatória'),
  zip_code: z
    .string()
    .length(8, 'CEP deve ter 8 dígitos')
    .regex(/^\d+$/, 'CEP deve conter apenas números'),
  street: z.string().min(3, 'Logradouro é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z
    .string()
    .length(2, 'Estado deve ser a sigla com 2 letras')
    .toUpperCase(),
})

export const orderCheckoutSchema = z.object({
  shipping_address_id: z.string().uuid('Selecione um endereço de entrega'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
})

export type AddressInput = z.infer<typeof addressSchema>
export type OrderCheckoutInput = z.infer<typeof orderCheckoutSchema>
