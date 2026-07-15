import { z } from 'zod'

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  authKey: z.string().min(1).max(500),
})
