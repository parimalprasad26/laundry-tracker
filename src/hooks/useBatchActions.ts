import { useMemo } from 'react'
import { addDays, isAfter, differenceInDays } from 'date-fns'
import type { BatchWithStatus, InspectionPolicy } from '@/types'

export interface BatchActions {
  canReportDamage: boolean
  canClose: boolean
  canOpenDispute: boolean
  damageWindowExpiresAt: Date | null
  daysLeftInDamageWindow: number | null
  disputeWindowExpiresAt: Date | null
  daysLeftInDisputeWindow: number | null
  isEditable: boolean
}

export function useBatchActions(
  batch: BatchWithStatus,
  policy: Pick<InspectionPolicy, 'inspection_window_days' | 'dispute_window_days'>
): BatchActions {
  return useMemo(() => {
    const now = new Date()

    if (batch.status === 'returned') {
      const anchor = batch.returned_at ? new Date(batch.returned_at) : now
      const deadline = addDays(anchor, policy.inspection_window_days)
      const expired = isAfter(now, deadline)
      const daysLeft = expired ? 0 : Math.max(0, differenceInDays(deadline, now))
      return {
        canReportDamage: !expired,
        canClose: true,
        canOpenDispute: false,
        damageWindowExpiresAt: deadline,
        daysLeftInDamageWindow: daysLeft,
        disputeWindowExpiresAt: null,
        daysLeftInDisputeWindow: null,
        isEditable: false,
      }
    }

    if (batch.status === 'closed') {
      const closedAt = batch.closed_at ? new Date(batch.closed_at) : new Date()
      const disputeDeadline = addDays(closedAt, policy.dispute_window_days)
      const disputeExpired = isAfter(now, disputeDeadline)
      const daysLeft = disputeExpired ? 0 : Math.max(0, differenceInDays(disputeDeadline, now))
      return {
        canReportDamage: false,
        canClose: false,
        canOpenDispute: !disputeExpired,
        damageWindowExpiresAt: null,
        daysLeftInDamageWindow: null,
        disputeWindowExpiresAt: disputeDeadline,
        daysLeftInDisputeWindow: daysLeft,
        isEditable: false,
      }
    }

    return {
      canReportDamage: false,
      canClose: false,
      canOpenDispute: false,
      damageWindowExpiresAt: null,
      daysLeftInDamageWindow: null,
      disputeWindowExpiresAt: null,
      daysLeftInDisputeWindow: null,
      isEditable: batch.status === 'draft' || batch.status === 'in_laundry',
    }
  }, [batch.status, batch.returned_at, batch.closed_at, policy])
}
