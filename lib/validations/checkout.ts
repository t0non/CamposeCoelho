import { z } from 'zod'

export const CheckoutSchema = z.object({
  idempotency_key: z.string().uuid('idempotency_key inválida'),
  shipping_address_id: z.string().uuid('Endereço inválido'),
})

export type CheckoutInput = z.infer<typeof CheckoutSchema>
