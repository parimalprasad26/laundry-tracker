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
