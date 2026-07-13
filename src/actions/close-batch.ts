'use server'

import { handleActionError } from '@/lib/handle-error'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import type { ActionResult } from '@/types'

export async function closeBatch(batchId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const batch = await new BatchService(supabase).getById(batchId)
    if (!batch || batch.user_id !== user.id) throw new Error('Batch not found')
    if (batch.status !== 'returned') {
      throw new Error(`Cannot close a batch with status '${batch.status}'. Only returned batches can be closed.`)
    }

    await new BatchStateMachineService(supabase).closeBatch(batchId, user.id)

    updateTag(`batch-${batchId}`)
    updateTag('batches')
    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
