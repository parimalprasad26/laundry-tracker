'use server'

import { handleActionError } from '@/lib/handle-error'
import * as Sentry from '@sentry/nextjs'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchService } from '@/services/BatchService'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import { notifyConnectedVendor } from '@/lib/vendor-notify'
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

    if (batch.vendor_id) {
      notifyConnectedVendor(createAdminClient(), batch.vendor_id, batchId, {
        title: 'A batch was closed',
        body: `"${batch.name}" is closed — no further changes expected`,
        tag: 'vendor-batch-closed',
      }).catch(err => Sentry.captureException(err, { extra: { context: 'vendor-notify', batchId } }))
    }

    return { success: true, data: undefined }
  } catch (e) {
    return handleActionError(e)
  }
}
