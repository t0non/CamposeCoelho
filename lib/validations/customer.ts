import { z } from 'zod'

export const approveCustomerSchema = z.object({
  company_id: z.string().uuid(),
  status: z.enum(['approved', 'rejected', 'suspended']),
  reason: z.string().max(500).optional(),
})

export type ApproveCustomerInput = z.infer<typeof approveCustomerSchema>
