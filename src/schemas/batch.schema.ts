import { z } from 'zod'

export const batchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  vendor_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  sent_at: z.string().datetime().optional().nullable(),
  returned_at: z.string().datetime().optional().nullable(),
  estimated_return: z.string().datetime().optional().nullable(),
  actual_cost: z.number().min(0).optional().nullable(),
  payment_status: z.enum(['unpaid', 'paid']).default('unpaid'),
  price_delta_note: z.string().max(500).optional().nullable(),
})

export type BatchFormValues = z.infer<typeof batchSchema>
