import { z } from 'zod'

const ITEM_TYPES = ['shirt', 'pants', 'dress', 'jacket', 'shorts', 'socks', 'underwear', 'sweater', 'suit', 'other'] as const

export const vendorPriceEntrySchema = z.object({
  item_type: z.enum(ITEM_TYPES),
  custom_type: z.string().min(2).max(30).nullable().optional(),
  unit_price: z.number().min(0).max(100_000),
})

export const vendorPriceEntriesSchema = z.array(vendorPriceEntrySchema)

export const customTypePriceEntrySchema = z.object({
  customType: z.string().min(2).max(30),
  price: z.number().min(0).max(100_000),
  batchItemIds: z.array(z.string().uuid()).min(1),
})

export const customTypePriceEntriesSchema = z.array(customTypePriceEntrySchema)
