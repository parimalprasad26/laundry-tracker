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
    ...overrides,
  }
}

function makeService() {
  return new DisputeService({} as ConstructorParameters<typeof DisputeService>[0])
}

describe('DisputeService.findOpenSwapByItem', () => {
  // Backs the mutual-exclusion guard in openDispute/reportBatchItemIssues —
  // a damage claim and a swap ("wrong item") claim can't both be open on
  // the same batch_item, since a swap means the item isn't the customer's.
  it('delegates to the repository with the given item and user', async () => {
    const service = makeService()
    const openSwap = makeDispute({ dispute_type: 'swap', wrong_item_description: 'not mine' })
    const repoFind = vi.fn().mockResolvedValue(openSwap)
    // @ts-expect-error — patching private repo for test
    service.repo.findOpenSwapByItem = repoFind

    const result = await service.findOpenSwapByItem('item-1', 'user-1')

    expect(repoFind).toHaveBeenCalledWith('item-1', 'user-1')
    expect(result).toBe(openSwap)
  })

  it('returns null when there is no open swap dispute on the item', async () => {
    const service = makeService()
    // @ts-expect-error — patching private repo for test
    service.repo.findOpenSwapByItem = vi.fn().mockResolvedValue(null)

    await expect(service.findOpenSwapByItem('item-1', 'user-1')).resolves.toBeNull()
  })
})

describe('DisputeService.resolve', () => {
  it('logs the event against the resolved dispute\'s own batch_id, ignoring any other source', async () => {
    const service = makeService()
    const resolved = makeDispute({ id: 'dispute-1', batch_id: 'real-batch', status: 'resolved' })
    const repoResolve = vi.fn().mockResolvedValue(resolved)
    const logEvent = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error — patching private members for test
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
})
