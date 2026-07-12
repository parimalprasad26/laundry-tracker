import { z } from 'zod'
import { BLOCKED_CUSTOM_NAMES } from '@/lib/item-type'

const ITEM_TYPES = ['shirt','pants','dress','jacket','shorts','socks','underwear','sweater','suit','other'] as const

export const closetItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(ITEM_TYPES).default('shirt'),
  custom_type: z.string().min(2, 'At least 2 characters').max(30).nullable().optional(),
  color: z.string().max(50).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  primary_image_path: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type !== 'other') return
  const name = data.custom_type?.trim()
  if (!name || name.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom name is required', path: ['custom_type'] })
    return
  }
  if (BLOCKED_CUSTOM_NAMES.has(name.toLowerCase())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose a specific type instead', path: ['custom_type'] })
  }
})

export type ClosetItemFormValues = z.infer<typeof closetItemSchema>
