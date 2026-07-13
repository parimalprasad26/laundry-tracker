import type { SupabaseClient } from '@supabase/supabase-js'
import { InspectionPolicyRepository } from '@/repositories/InspectionPolicyRepository'
import type { BatchWithStatus, InspectionPolicy } from '@/types'
import { addDays, isAfter } from 'date-fns'

export interface DamageReportability {
  allowed: boolean
  reason: string
  expiresAt?: Date
  suggestDispute?: boolean
}

export interface DisputeEligibility {
  allowed: boolean
  reason?: string
  expiresAt?: Date
}

export class InspectionPolicyService {
  private repo: InspectionPolicyRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new InspectionPolicyRepository(supabase)
  }

  async getPolicy(userId: string): Promise<InspectionPolicy> {
    return this.repo.findByUser(userId)
  }

  async isDamageReportable(
    batch: BatchWithStatus,
    userId: string
  ): Promise<DamageReportability> {
    if (batch.status === 'draft') {
      return { allowed: false, reason: 'Batch has not been sent yet.' }
    }
    if (batch.status === 'in_laundry') {
      return { allowed: false, reason: 'Items are still at the vendor. Mark them returned first.' }
    }
    if (batch.status === 'closed') {
      const policy = await this.repo.findByUser(userId)
      const closedAt = new Date(batch.closed_at!)
      const disputeDeadline = addDays(closedAt, policy.dispute_window_days)
      if (isAfter(new Date(), disputeDeadline)) {
        return {
          allowed: false,
          reason: `Dispute window closed ${policy.dispute_window_days} days after batch was closed.`,
        }
      }
      return {
        allowed: false,
        reason: 'Batch is closed. Open a dispute to report damage found after closing.',
        suggestDispute: true,
      }
    }

    // status === 'returned': check inspection window
    const policy = await this.repo.findByUser(userId)
    // returned_at is set when all items return; use it as window anchor
    const anchor = batch.returned_at ? new Date(batch.returned_at) : new Date()
    const windowDeadline = addDays(anchor, policy.inspection_window_days)

    if (isAfter(new Date(), windowDeadline)) {
      return {
        allowed: false,
        reason: `Inspection window closed ${policy.inspection_window_days} days after return.`,
        suggestDispute: true,
      }
    }
    return { allowed: true, reason: '', expiresAt: windowDeadline }
  }

  async isDisputeEligible(
    batch: BatchWithStatus,
    userId: string
  ): Promise<DisputeEligibility> {
    if (batch.status !== 'closed') {
      return { allowed: false, reason: 'Only closed batches support disputes.' }
    }
    const policy = await this.repo.findByUser(userId)
    const closedAt = new Date(batch.closed_at!)
    const deadline = addDays(closedAt, policy.dispute_window_days)
    if (isAfter(new Date(), deadline)) {
      return {
        allowed: false,
        reason: `Dispute window closed ${policy.dispute_window_days} days after batch was closed.`,
      }
    }
    return { allowed: true, expiresAt: deadline }
  }
}
