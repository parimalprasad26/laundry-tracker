import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { closetStoragePath, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/utils'
import { z, ZodError } from 'zod'

const schema = z.object({
  mimeType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().int().max(MAX_FILE_SIZE_BYTES),
})

const BUCKET = 'laundry-images'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    schema.parse(body)
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    const path = closetStoragePath(user.id, filename)

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error) throw error

    return NextResponse.json({ signedUrl: data.signedUrl, path, token: data.token })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
