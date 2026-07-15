import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchDisputeRepository } from '@/repositories/BatchDisputeRepository'
import { BatchStateMachineService } from './BatchStateMachineService'
import { disputeClaimSchema, swapClaimSchema, disputeResolutionSchema } from '@/schemas/dispute.schema'
import type { BatchDispute, DisputeStatus } from '@/types'

export interface DisputeClaim {
  damaged_qty: number
  description?: string | null
}

export interface SwapClaim {
  wrong_item_description: string
}

export class DisputeService {
  private repo: BatchDisputeRepository
  private stateMachine: BatchStateMachineService

  constructor(supabase: SupabaseClient) {
    this.repo = new BatchDisputeRepository(supabase)
    this.stateMachine = new BatchStateMachineService(supabase)
  }

  async open(
    batchId: string,
    itemId: string,
    userId: string,
    claim: DisputeClaim
  ): Promise<BatchDispute> {
    const validated = disputeClaimSchema.parse(claim)
    const dispute = await this.repo.create({
      batch_id: batchId,
      batch_item_id: itemId,
      user_id: userId,
      damaged_qty: validated.damaged_qty,
      description: validated.description,
      dispute_type: 'damage',
    })
    await this.stateMachine.logEvent(batchId, userId, 'batch.dispute_opened', {
      dispute_id: dispute.id,
      item_id: itemId,
      damaged_qty: validated.damaged_qty,
    })
    return dispute
  }

  async openSwap(
    batchId: string,
    itemId: string,
    userId: string,
    claim: SwapClaim
  ): Promise<BatchDispute> {
    const validated = swapClaimSchema.parse(claim)
    const dispute = await this.repo.create({
      batch_id: batchId,
      batch_item_id: itemId,
      user_id: userId,
      damaged_qty: 0,
      dispute_type: 'swap',
      wrong_item_description: validated.wrong_item_description,
    })
    await this.stateMachine.logEvent(batchId, userId, 'batch.dispute_opened', {
      dispute_id: dispute.id,
      item_id: itemId,
      dispute_type: 'swap',
    })
    return dispute
  }

  async resolve(
    disputeId: string,
    userId: string,
    resolution: string,
    status: DisputeStatus = 'resolved'
  ): Promise<BatchDispute> {
    const validated = disputeResolutionSchema.parse({ resolution })
    const dispute = await this.repo.resolve(disputeId, userId, validated.resolution, status)
    // Log the event against the dispute's own batch_id, not a client-supplied one —
    // the repo update is scoped by disputeId+userId, so this is the verified source of truth.
    await this.stateMachine.logEvent(dispute.batch_id, userId, 'batch.dispute_resolved', {
      dispute_id: disputeId,
      resolution,
      status,
    })
    return dispute
  }

  async getByBatch(batchId: string, userId: string): Promise<BatchDispute[]> {
    return this.repo.findByBatch(batchId, userId)
  }

  async countOpen(batchId: string, userId: string): Promise<number> {
    return this.repo.countOpenByBatch(batchId, userId)
  }
}
