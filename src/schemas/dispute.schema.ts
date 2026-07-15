import { z } from 'zod'

export const disputeClaimSchema = z.object({
  damaged_qty: z.number().int().min(1).max(1000),
  description: z.string().max(500).nullable().optional(),
})

export const swapClaimSchema = z.object({
  wrong_item_description: z.string().min(1).max(500),
})

export const disputeResolutionSchema = z.object({
  resolution: z.string().min(1).max(1000),
})
