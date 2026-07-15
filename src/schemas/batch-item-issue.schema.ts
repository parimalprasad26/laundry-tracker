import { z } from 'zod'

export const batchItemIssueSchema = z.object({
  damagedQty: z.number().int().min(0).max(10_000),
  missingQty: z.number().int().min(0).max(10_000),
})
