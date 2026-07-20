import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { BatchDisputeRepository } from '@/repositories/BatchDisputeRepository'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'
import { BatchRepository } from '@/repositories/BatchRepository'
import { VendorConnectionRepository } from '@/repositories/VendorConnectionRepository'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import { InspectionPolicyRepository } from '@/repositories/InspectionPolicyRepository'
import { BatchStateMachineService } from './BatchStateMachineService'
import { disputeClaimSchema, swapClaimSchema, disputeResolutionSchema } from '@/schemas/dispute.schema'
import { addDays, isAfter } from 'date-fns'
import type { BatchDispute, BatchDisputeWithContext, DisputeStatus, VendorDispute } from '@/types'

export interface DisputeClaim {
  damaged_qty: number
  description?: string | null
}

export interface SwapClaim {
  wrong_item_description: string
}

export type VendorClaim =
  | ({ dispute_type: 'damage' } & DisputeClaim)
  | ({ dispute_type: 'swap' } & SwapClaim)

// Constructed with the caller's own authenticated (RLS-scoped) client for
// the customer-facing methods (open/openSwap/resolve/getByBatch — all
// scoped by the customer's own user_id, which RLS already enforces). The
// vendor-facing methods below (raiseAsVendor/resolveAsVendor) write into
// disputes owned by a DIFFERENT user (the customer), which a vendor's own
// session has zero RLS access to — those go through a separate,
// internally-held admin client, only after re-verifying the caller's
// vendor identity against the target connection, mirroring
// VendorConnectionService/VendorPriceRequestService.
export class DisputeService {
  private repo: BatchDisputeRepository
  private stateMachine: BatchStateMachineService
  private _adminClient?: SupabaseClient
  private _adminRepo?: BatchDisputeRepository
  private _adminBatchItemRepo?: BatchItemRepository
  private _adminBatchRepo?: BatchRepository
  private _adminConnectionRepo?: VendorConnectionRepository
  private _adminVendorAccountRepo?: VendorAccountRepository
  private _adminInspectionPolicyRepo?: InspectionPolicyRepository
  private _adminStateMachine?: BatchStateMachineService

  constructor(supabase: SupabaseClient) {
    this.repo = new BatchDisputeRepository(supabase)
    this.stateMachine = new BatchStateMachineService(supabase)
  }

  // Lazy — see VendorConnectionService for why (testability without
  // service-role env vars present, and to avoid constructing the admin
  // client on every instantiation when a caller only needs the
  // customer-facing methods).
  private get adminClient(): SupabaseClient {
    return (this._adminClient ??= createAdminClient())
  }
  private get adminRepo(): BatchDisputeRepository {
    return (this._adminRepo ??= new BatchDisputeRepository(this.adminClient))
  }
  private get adminBatchItemRepo(): BatchItemRepository {
    return (this._adminBatchItemRepo ??= new BatchItemRepository(this.adminClient))
  }
  private get adminBatchRepo(): BatchRepository {
    return (this._adminBatchRepo ??= new BatchRepository(this.adminClient))
  }
  private get adminConnectionRepo(): VendorConnectionRepository {
    return (this._adminConnectionRepo ??= new VendorConnectionRepository(this.adminClient))
  }
  private get adminVendorAccountRepo(): VendorAccountRepository {
    return (this._adminVendorAccountRepo ??= new VendorAccountRepository(this.adminClient))
  }
  private get adminInspectionPolicyRepo(): InspectionPolicyRepository {
    return (this._adminInspectionPolicyRepo ??= new InspectionPolicyRepository(this.adminClient))
  }
  private get adminStateMachine(): BatchStateMachineService {
    return (this._adminStateMachine ??= new BatchStateMachineService(this.adminClient))
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

    // user_id on a vendor-raised dispute is still the customer's (by design —
    // see raiseAsVendor), so the plain user_id-scoped update below would
    // otherwise let a customer unilaterally resolve a claim the vendor made
    // about their own item, defeating the symmetric-resolution design
    // (vendor-raised issues are only resolved via resolveAsVendor).
    const existing = await this.repo.findById(disputeId)
    if (!existing || existing.user_id !== userId) throw new Error('Dispute not found')
    if (existing.raised_by_role === 'vendor') {
      throw new Error('This issue was raised by the vendor — only they can mark it resolved')
    }

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

  async findOpenByItem(batchItemId: string, userId: string): Promise<BatchDispute | null> {
    return this.repo.findOpenByItem(batchItemId, userId)
  }

  async getByBatch(batchId: string, userId: string): Promise<BatchDispute[]> {
    return this.repo.findByBatch(batchId, userId)
  }

  async countOpen(batchId: string, userId: string): Promise<number> {
    return this.repo.countOpenByBatch(batchId, userId)
  }

  // Cross-batch aggregation for the customer's Issues tab.
  async findAllForUser(userId: string): Promise<BatchDisputeWithContext[]> {
    return this.repo.findAllForUser(userId)
  }

  // Single-dispute fetch for the customer's chat view page.
  async findByIdForUser(disputeId: string, userId: string): Promise<BatchDisputeWithContext | null> {
    return this.repo.findByIdForUser(disputeId, userId)
  }

  // Cross-connection aggregation for the vendor's Issues tab — via the
  // caller's own session (not admin), same reasoning as
  // VendorConnectionService's read methods.
  async listForVendor(): Promise<VendorDispute[]> {
    return this.repo.findAllForVendor()
  }

  // ── Vendor-side raise/resolve — identity-checked against
  // vendorAuthUserId, executed via the internally-held admin client ──

  async raiseAsVendor(
    vendorAuthUserId: string,
    connectionId: string,
    batchItemId: string,
    claim: VendorClaim
  ): Promise<BatchDispute> {
    const connection = await this.adminConnectionRepo.findById(connectionId)
    if (!connection || connection.status !== 'active') throw new Error('Connection not found')

    const vendorAccount = await this.adminVendorAccountRepo.findById(connection.vendor_account_id)
    if (!vendorAccount || vendorAccount.auth_user_id !== vendorAuthUserId) throw new Error('Connection not found')

    const batchItem = await this.adminBatchItemRepo.findByIdServiceRole(batchItemId)
    if (!batchItem) throw new Error('Item not found')

    const batch = await this.adminBatchRepo.findById(batchItem.batch_id)
    // laundry_vendor_id, not vendor_account_id — a batch's vendor_id points
    // at the customer's private laundry_vendors row, which is what a
    // connection resolves to (see VendorConnectionRepository.acceptServiceRole).
    if (!batch || batch.vendor_id !== connection.laundry_vendor_id) throw new Error('Item not found')
    if (!batch.sent_at) throw new Error('Cannot flag an issue on a batch that has not been sent yet')

    // No window while the batch is still active (draft/in_laundry/returned)
    // — the vendor may still physically have the item and legitimately
    // notice something at any point. Once closed, bound it the same way the
    // customer's own post-close dispute window works, using the customer's
    // policy (the vendor has none of their own — this is about the
    // customer's batch).
    if (batch.status === 'closed') {
      const policy = await this.adminInspectionPolicyRepo.findByUser(batch.user_id)
      const deadline = addDays(new Date(batch.closed_at!), policy.dispute_window_days)
      if (isAfter(new Date(), deadline)) {
        throw new Error(`This batch's dispute window closed ${policy.dispute_window_days} days after it was closed`)
      }
    }

    // Same mutual-exclusion invariant as the customer-facing guards
    // (openDispute/openSwapDispute/reportBatchItemIssues) — at most one open
    // issue per item, regardless of who raises it.
    const existingOpen = await this.adminRepo.findOpenByItem(batchItemId, batch.user_id)
    if (existingOpen) throw new Error('This item already has an open issue')
    if (batchItem.damaged_qty > 0 || batchItem.missing_qty > 0) {
      throw new Error('This item already has a damage report')
    }

    const base = {
      batch_id: batch.id,
      batch_item_id: batchItemId,
      user_id: batch.user_id,
      raised_by_role: 'vendor' as const,
      vendor_account_id: vendorAccount.id,
    }

    const dispute = await this.adminRepo.create(
      claim.dispute_type === 'damage'
        ? { ...base, ...disputeClaimSchema.parse(claim), dispute_type: 'damage' }
        : { ...base, damaged_qty: 0, dispute_type: 'swap', ...swapClaimSchema.parse(claim) }
    )

    await this.adminStateMachine.logEvent(batch.id, batch.user_id, 'batch.dispute_opened', {
      dispute_id: dispute.id,
      item_id: batchItemId,
      dispute_type: dispute.dispute_type,
      raised_by_role: 'vendor',
    })

    return dispute
  }

  async resolveAsVendor(disputeId: string, vendorAuthUserId: string, resolution: string): Promise<BatchDispute> {
    const validated = disputeResolutionSchema.parse({ resolution })

    const dispute = await this.adminRepo.findById(disputeId)
    if (!dispute || dispute.raised_by_role !== 'vendor' || !dispute.vendor_account_id) {
      throw new Error('Dispute not found')
    }

    const vendorAccount = await this.adminVendorAccountRepo.findById(dispute.vendor_account_id)
    if (!vendorAccount || vendorAccount.auth_user_id !== vendorAuthUserId) throw new Error('Dispute not found')

    const resolved = await this.adminRepo.resolveServiceRole(disputeId, validated.resolution, 'resolved')

    await this.adminStateMachine.logEvent(resolved.batch_id, resolved.user_id, 'batch.dispute_resolved', {
      dispute_id: disputeId,
      resolution: validated.resolution,
      status: 'resolved',
      raised_by_role: 'vendor',
    })

    return resolved
  }
}
