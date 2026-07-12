import { z } from 'zod'

const ITEM_TYPES = ['shirt','pants','dress','jacket','shorts','socks','underwear','sweater','suit','other'] as const

export const closetItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(ITEM_TYPES).default('other'),
  color: z.string().max(50).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  primary_image_path: z.string().optional().nullable(),
})

export type ClosetItemFormValues = z.infer<typeof closetItemSchema>
