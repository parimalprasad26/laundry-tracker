import { z } from 'zod'

export const vendorAccountProfileSchema = z.object({
  business_name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
})

export type VendorAccountProfileValues = z.infer<typeof vendorAccountProfileSchema>

const ITEM_TYPES = ['shirt', 'pants', 'dress', 'jacket', 'shorts', 'socks', 'underwear', 'sweater', 'suit', 'other'] as const

export const vendorAccountStandardPriceSchema = z.object({
  item_type: z.enum(ITEM_TYPES).refine(t => t !== 'other', { message: 'Custom types are set via price requests, not the rate card editor' }),
  unit_price: z.number().min(0).max(100_000),
})

export const vendorAccountPriceResolutionSchema = z.object({
  requestId: z.string().uuid(),
  unitPrice: z.number().min(0).max(100_000),
})

export const vendorSearchQuerySchema = z.string().min(1).max(80)
