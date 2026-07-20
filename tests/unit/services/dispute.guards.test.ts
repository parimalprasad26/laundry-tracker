import { describe, it, expect, vi } from 'vitest'
import { DisputeService } from '@/services/DisputeService'
import type { BatchDispute } from '@/types'

function makeDispute(overrides: Partial<BatchDispute> = {}): BatchDispute {
  return {
    id: 'dispute-1',
    batch_id: 'batch-1',
    batch_item_id: 'item-1',
    user_id: 'user-1',
    reported_at: new Date().toISOString(),
    damaged_qty: 1,
    description: null,
    dispute_type: 'damage',
    wrong_item_description: null,
    status: 'open',
    resolved_at: null,
    resolution: null,
    raised_by_role: 'customer',
    vendor_account_id: null,
    ...overrides,
  }
}

function makeService() {
  return new DisputeService({} as ConstructorParameters<typeof DisputeService>[0])
}

describe('DisputeService.findOpenByItem', () => {
  // Backs the mutual-exclusion guard in openDispute/openSwapDispute/
  // reportBatchItemIssues/raiseAsVendor — at most one open issue per item,
  // regardless of type or who raised it (customer or vendor).
  it('delegates to the repository with the given item and user', async () => {
    const service = makeService()
    const openSwap = makeDispute({ dispute_type: 'swap', wrong_item_description: 'not mine' })
    const repoFind = vi.fn().mockResolvedValue(openSwap)
    // @ts-expect-error — patching private repo for test
    service.repo.findOpenByItem = repoFind

    const result = await service.findOpenByItem('item-1', 'user-1')

    expect(repoFind).toHaveBeenCalledWith('item-1', 'user-1')
    expect(result).toBe(openSwap)
  })

  it('returns null when there is no open dispute on the item', async () => {
    const service = makeService()
    // @ts-expect-error — patching private repo for test
    service.repo.findOpenByItem = vi.fn().mockResolvedValue(null)

    await expect(service.findOpenByItem('item-1', 'user-1')).resolves.toBeNull()
  })
})

describe('DisputeService.resolve', () => {
  it('logs the event against the resolved dispute\'s own batch_id, ignoring any other source', async () => {
    const service = makeService()
    const existing = makeDispute({ id: 'dispute-1', batch_id: 'real-batch', user_id: 'user-1' })
    const resolved = { ...existing, status: 'resolved' as const }
    const repoResolve = vi.fn().mockResolvedValue(resolved)
    const logEvent = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error — patching private members for test
    service.repo.findById = vi.fn().mockResolvedValue(existing)
    // @ts-expect-error
    service.repo.resolve = repoResolve
    // @ts-expect-error
    service.stateMachine.logEvent = logEvent

    await service.resolve('dispute-1', 'user-1', 'Refunded')

    expect(repoResolve).toHaveBeenCalledWith('dispute-1', 'user-1', 'Refunded', 'resolved')
    expect(logEvent).toHaveBeenCalledWith(
      'real-batch',
      'user-1',
      'batch.dispute_resolved',
      expect.objectContaining({ dispute_id: 'dispute-1', resolution: 'Refunded' }),
    )
  })

  it('throws when the dispute does not exist or belongs to a different user', async () => {
    const service = makeService()
    // @ts-expect-error
    service.repo.findById = vi.fn().mockResolvedValue(makeDispute({ user_id: 'someone-else' }))
    await expect(service.resolve('dispute-1', 'user-1', 'Refunded')).rejects.toThrow('Dispute not found')
  })

  it('throws when the customer tries to resolve a vendor-raised dispute', async () => {
    const service = makeService()
    // @ts-expect-error
    service.repo.findById = vi.fn().mockResolvedValue(
      makeDispute({ user_id: 'user-1', raised_by_role: 'vendor', vendor_account_id: 'vendor-account-1' })
    )
    const repoResolve = vi.fn()
    // @ts-expect-error
    service.repo.resolve = repoResolve

    await expect(service.resolve('dispute-1', 'user-1', 'Refunded')).rejects.toThrow('only they can mark it resolved')
    expect(repoResolve).not.toHaveBeenCalled()
  })
})
