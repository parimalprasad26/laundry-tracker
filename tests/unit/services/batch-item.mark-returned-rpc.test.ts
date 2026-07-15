import { describe, it, expect, vi } from 'vitest'
import { BatchItemRepository } from '@/repositories/BatchItemRepository'

function makeRepo() {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  const supabase = { rpc } as unknown as ConstructorParameters<typeof BatchItemRepository>[0]
  return { repo: new BatchItemRepository(supabase), rpc }
}

describe('BatchItemRepository.markAllReturned', () => {
  it('calls the bulk RPC with no exclusions instead of one UPDATE per item', async () => {
    const { repo, rpc } = makeRepo()

    await repo.markAllReturned('batch-1', 'user-1')

    expect(rpc).toHaveBeenCalledWith('mark_batch_items_returned', {
      p_batch_id: 'batch-1',
      p_user_id: 'user-1',
    })
  })
})

describe('BatchItemRepository.markSelectivelyReturned', () => {
  it('calls the bulk RPC with the missing item ids excluded', async () => {
    const { repo, rpc } = makeRepo()

    await repo.markSelectivelyReturned('batch-1', 'user-1', ['item-2', 'item-3'])

    expect(rpc).toHaveBeenCalledWith('mark_batch_items_returned', {
      p_batch_id: 'batch-1',
      p_user_id: 'user-1',
      p_excluded_ids: ['item-2', 'item-3'],
    })
  })
})
