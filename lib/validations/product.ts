import { z } from 'zod'

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens'),
  description: z.string().optional(),
  category_id: z.string().uuid('Categoria inválida').nullable().optional(),
  brand_id: z.string().uuid('Marca inválida').nullable().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  min_quantity: z.number().int().min(1, 'Quantidade mínima deve ser ao menos 1'),
  multiple_quantity: z.number().int().min(1, 'Múltiplo deve ser ao menos 1'),
  weight_grams: z.number().positive().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const priceSchema = z.object({
  product_id: z.string().uuid(),
  price_table_id: z.string().uuid(),
  unit_price: z.number().positive('Preço deve ser maior que zero'),
  promotional_price: z.number().positive().optional().nullable(),
  promotion_starts_at: z.string().datetime().optional().nullable(),
  promotion_ends_at: z.string().datetime().optional().nullable(),
})

export type ProductInput = z.infer<typeof productSchema>
export type PriceInput = z.infer<typeof priceSchema>
