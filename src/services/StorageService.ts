import type { SupabaseClient } from '@supabase/supabase-js'
import { storagePath } from '@/lib/utils'
import { ALLOWED_MIME_TYPES } from '@/lib/utils'
import type { SignedUrlRequest } from '@/schemas/image.schema'

const BUCKET = 'laundry-images'

export class StorageService {
  constructor(private supabase: SupabaseClient) {}

  async createSignedUploadUrl(userId: string, input: SignedUrlRequest): Promise<{
    signedUrl: string
    path: string
    token: string
  }> {
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new Error('Invalid file type')
    }

    const filename = `original_${Date.now()}.jpg`
    const path = storagePath(userId, input.batchId, input.itemId, filename)

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error) throw error

    return { signedUrl: data.signedUrl, path, token: data.token }
  }

  async verifyFileExists(path: string): Promise<boolean> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .list(path.substring(0, path.lastIndexOf('/')), {
        search: path.substring(path.lastIndexOf('/') + 1),
      })

    if (error) return false
    return (data?.length ?? 0) > 0
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  }
}
