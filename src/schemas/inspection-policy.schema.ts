import { z } from 'zod'

export const inspectionPolicySchema = z.object({
  inspection_window_days: z.number().int().min(1).max(365).optional(),
  auto_close_days: z.number().int().min(1).max(365).optional(),
  dispute_window_days: z.number().int().min(1).max(365).optional(),
})
