import { z } from 'zod'

export const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type VendorFormValues = z.infer<typeof vendorSchema>
