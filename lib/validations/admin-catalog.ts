import 'server-only'
import { z } from 'zod'

export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').max(150, 'Máximo 150 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens'),
  description: z.string().max(500).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0, 'A posição não pode ser negativa').default(0),
  is_active: z.boolean().default(true),
  seo_title: z.string().max(60).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
})

export const BrandInputSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  seo_title: z.string().max(60).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
})

export const ProductInputSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  slug: z.string().min(1).max(250).regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1, 'SKU é obrigatório').max(100),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid('Categoria inválida'),
  brand_id: z.string().uuid('Marca inválida').optional().nullable(),
  unit: z.string().min(1).max(20).default('UN'),
  min_quantity: z.number().int().min(1, 'Mínimo de 1').default(1),
  multiple_quantity: z.number().int().min(1, 'Mínimo de 1').default(1),
  weight_grams: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  is_published: z.boolean().default(false), // Novo produto sempre rascunho
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  seo_title: z.string().max(60).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
})

export const ProductVariantInputSchema = z.object({
  product_id: z.string().uuid(),
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  attributes: z.record(z.string(), z.string()).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  min_quantity: z.number().int().min(1).default(1),
  multiple_quantity: z.number().int().min(1).default(1),
  is_active: z.boolean().default(true),
})

export const InventoryAdjustmentInputSchema = z.object({
  inventory_id: z.string().uuid(),
  quantity_delta: z.number().int().refine((v) => v !== 0, 'Delta não pode ser 0'),
  movement_type: z.enum(['adjustment', 'sale', 'return', 'reservation', 'release']),
  reason: z.string().min(1, 'Motivo é obrigatório').max(200),
  reference_type: z.string().max(50).optional().nullable(),
  reference_id: z.string().uuid().optional().nullable(),
})

export const PriceTableBaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
})

export const PriceTableInputSchema = PriceTableBaseSchema.refine((data) => {
  if (data.starts_at && data.ends_at) {
    return new Date(data.starts_at) < new Date(data.ends_at)
  }
  return true
}, { message: 'A data de término deve ser posterior à data de início', path: ['ends_at'] })

export const PriceEntryInputSchema = z.object({
  price_table_id: z.string().uuid(),
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  unit_price: z.string().min(1, 'Preço é obrigatório'),
  promotional_price: z.string().optional().nullable(),
  promotion_starts_at: z.string().datetime().optional().nullable(),
  promotion_ends_at: z.string().datetime().optional().nullable(),
  min_quantity: z.number().int().min(1, 'Quantidade mínima inválida').default(1),
}).refine((data) => {
  if (data.promotional_price) {
    const normal = Number(data.unit_price)
    const promo = Number(data.promotional_price)
    return promo < normal
  }
  return true
}, { message: 'O preço promocional deve ser menor que o preço normal', path: ['promotional_price'] })
.refine((data) => {
  if (data.promotion_starts_at && data.promotion_ends_at) {
    return new Date(data.promotion_starts_at) < new Date(data.promotion_ends_at)
  }
  return true
}, { message: 'A data de término da promoção deve ser posterior à data de início', path: ['promotion_ends_at'] })
