import { z } from 'zod'

export const ProductInputSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').max(255),
  slug: z.string()
    .min(1, 'O slug é obrigatório')
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minúsculas, números e hifens'),
  sku: z.string()
    .min(1, 'O SKU é obrigatório')
    .max(100)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU deve conter apenas letras, números, hifens e underscores'),
  description: z.string().max(5000).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid('ID de categoria inválido').nullable().optional(),
  brand_id: z.string().uuid('ID de marca inválido').nullable().optional(),
  unit: z.string().min(1).max(50).default('UN'),
  min_quantity: z.number().int().positive('A quantidade mínima deve ser maior que zero').default(1),
  multiple_quantity: z.number().int().positive('O múltiplo deve ser maior que zero').default(1),
  weight_grams: z.number().nonnegative('O peso não pode ser negativo').optional().nullable(),
  is_active: z.boolean().default(false),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  seo_title: z.string().max(255).optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
})

export type ProductInput = z.infer<typeof ProductInputSchema>

export const VariantInputSchema = z.object({
  product_id: z.string().uuid('ID de produto inválido'),
  name: z.string().min(1, 'O nome é obrigatório').max(255),
  sku: z.string()
    .min(1, 'O SKU é obrigatório')
    .max(100)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU deve conter apenas letras, números, hifens e underscores'),
  barcode: z.string().max(255).optional().nullable(),
  attributes: z.record(z.string(), z.string()).optional().default({}),
  min_quantity: z.number().int().positive('A quantidade mínima deve ser maior que zero').default(1),
  multiple_quantity: z.number().int().positive('O múltiplo deve ser maior que zero').default(1),
  is_active: z.boolean().default(true),
})

export type VariantInput = z.infer<typeof VariantInputSchema>

export const ImageAltTextInputSchema = z.object({
  product_id: z.string().uuid('ID de produto inválido'),
  image_id: z.string().uuid('ID de imagem inválido'),
  alt_text: z.string().max(500).optional().nullable(),
})
