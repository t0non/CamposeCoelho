import { z } from 'zod'

const MAX_CART_QUANTITY = 9999

export const AddToCartSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  variant_id: z.string().uuid('variant_id inválido').nullable().optional(),
  // quantity: inteiro positivo, sem decimal, sem overflow
  quantity: z
    .number({
      invalid_type_error: 'Quantidade deve ser um número inteiro',
      required_error: 'Quantidade é obrigatória',
    })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .max(MAX_CART_QUANTITY, `Quantidade máxima permitida: ${MAX_CART_QUANTITY}`),
  // Customer DEVE enviar undefined/null, Seller DEVE enviar UUID válido
  target_company_id: z.string().uuid('target_company_id inválido').nullable().optional(),
})

export const UpdateCartItemSchema = z.object({
  item_id: z.string().uuid('item_id inválido'),
  quantity: z
    .number({
      invalid_type_error: 'Quantidade deve ser um número inteiro',
      required_error: 'Quantidade é obrigatória',
    })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero (use remover para excluir)')
    .max(MAX_CART_QUANTITY, `Quantidade máxima permitida: ${MAX_CART_QUANTITY}`),
})

export const RemoveCartItemSchema = z.object({
  item_id: z.string().uuid('item_id inválido'),
})

export const ClearCartSchema = z.object({
  // Seller envia target_company_id; Customer envia null/undefined
  target_company_id: z.string().uuid('target_company_id inválido').nullable().optional(),
})

export type AddToCartInput = z.infer<typeof AddToCartSchema>
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>
export type RemoveCartItemInput = z.infer<typeof RemoveCartItemSchema>
export type ClearCartInput = z.infer<typeof ClearCartSchema>
