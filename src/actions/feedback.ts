'use server'

import { handleActionError } from '@/lib/handle-error'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

export async function submitFeedback(message: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const trimmed = message.trim()
    if (!trimmed || trimmed.length > 2000) throw new Error('Invalid message')

    const { error } = await supabase
      .from('feedback')
      .insert({ user_id: user.id, message: trimmed })

    if (error) throw error
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
