import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StorageService } from '@/services/StorageService'
import { signedUrlRequestSchema } from '@/schemas/image.schema'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const input = signedUrlRequestSchema.parse(body)

    const { data: item } = await supabase
      .from('batch_items')
      .select('id')
      .eq('id', input.itemId)
      .eq('batch_id', input.batchId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 403 })
    }

    const storageService = new StorageService(supabase)
    const result = await storageService.createSignedUploadUrl(user.id, input)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: e.issues }, { status: 422 })
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
