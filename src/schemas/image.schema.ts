import { z } from 'zod'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/utils'

export const signedUrlRequestSchema = z.object({
  itemId: z.string().uuid(),
  batchId: z.string().uuid(),
  mimeType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().int().max(MAX_FILE_SIZE_BYTES),
})

export const imageRecordSchema = z.object({
  itemId: z.string().uuid(),
  batchId: z.string().uuid(),
  storagePath: z.string().min(1),
  thumbnailPath: z.string().optional().nullable(),
  mimeType: z.string(),
  fileSize: z.number().int().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
})

export type SignedUrlRequest = z.infer<typeof signedUrlRequestSchema>
export type ImageRecordInput = z.infer<typeof imageRecordSchema>
