import { z } from 'zod'

export const budgetSchema = z.object({
  budgetAmount: z.number().min(0).max(1_000_000).nullable(),
  budgetPeriod: z.enum(['weekly', 'monthly', 'yearly']),
})

export const reminderThresholdSchema = z.object({
  days: z.number().int().min(1).max(365),
})
