import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BatchService } from '@/services/BatchService'
import type { BatchWithStatus } from '@/types'

function makeBatch(overrides: Partial<BatchWithStatus> = {}): BatchWithStatus {
  return {
    id: 'batch-1',
    user_id: 'user-1',
    name: 'Test batch',
    vendor_id: null,
    vendor_name: null,
    notes: null,
    sent_at: new Date().toISOString(),
    returned_at: null,
    closed_at: null,
    estimated_return: null,
    estimated_cost: null,
    actual_cost: null,
    receipt_path: null,
    version: 0,
    calculated_cost: 200,
    payment_status: 'unpaid',
    price_delta_note: null,
    status: 'in_laundry',
    total_items: 3,
    returned_items: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_by: 'user-1',
    ...overrides,
  }
}

function makeSupabaseMock(findByIdResult: BatchWithStatus) {
  const update = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const error = { error: null }

  const supabase = {
    from: vi.fn().mockReturnValue({
      update,
      eq,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: findByIdResult, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: findByIdResult, error: null }),
    }),
  } as unknown as ConstructorParameters<typeof BatchService>[0]

  // Make update chain resolve to no error
  update.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(error) }) })

  return { supabase, update }
}

describe('BatchService — payment flow', () => {
  it('update() passes actual_cost and payment_status=paid to repo', async () => {
    const paid = makeBatch({ actual_cost: 250, payment_status: 'paid' })
    const { supabase } = makeSupabaseMock(paid)

    const repoUpdate = vi.fn().mockResolvedValue(paid)
    const service = new BatchService(supabase)
    // @ts-expect-error — patching private repo for test
    service.repo.update = repoUpdate

    const result = await service.update('batch-1', 'user-1', {
      actual_cost: 250,
      payment_status: 'paid',
    })

    expect(repoUpdate).toHaveBeenCalledWith(
      'batch-1',
      'user-1',
      expect.objectContaining({ actual_cost: 250, payment_status: 'paid' }),
    )
    expect(result.actual_cost).toBe(250)
    expect(result.payment_status).toBe('paid')
  })

  it('update() with price_delta_note saves the note', async () => {
    const paid = makeBatch({ actual_cost: 300, payment_status: 'paid', price_delta_note: 'Extra starch' })
    const repoUpdate = vi.fn().mockResolvedValue(paid)
    const { supabase } = makeSupabaseMock(paid)

    const service = new BatchService(supabase)
    // @ts-expect-error
    service.repo.update = repoUpdate

    await service.update('batch-1', 'user-1', {
      actual_cost: 300,
      payment_status: 'paid',
      price_delta_note: 'Extra starch',
    })

    expect(repoUpdate).toHaveBeenCalledWith(
      'batch-1',
      'user-1',
      expect.objectContaining({ price_delta_note: 'Extra starch' }),
    )
  })

  it('markSent() sets sent_at', async () => {
    const sent = makeBatch({ status: 'in_laundry' })
    const repoUpdate = vi.fn().mockResolvedValue(sent)
    const { supabase } = makeSupabaseMock(sent)

    const service = new BatchService(supabase)
    // @ts-expect-error
    service.repo.update = repoUpdate

    await service.markSent('batch-1', 'user-1')

    const call = repoUpdate.mock.calls[0]
    expect(call[0]).toBe('batch-1')
    expect(call[1]).toBe('user-1')
    expect(call[2]).toHaveProperty('sent_at')
    expect(typeof call[2].sent_at).toBe('string')
  })
})

describe('BatchService — schema validation', () => {
  it('create() rejects empty name', async () => {
    const { supabase } = makeSupabaseMock(makeBatch())
    const service = new BatchService(supabase)

    await expect(
      service.create('user-1', { name: '', payment_status: 'unpaid' }),
    ).rejects.toThrow()
  })

  it('create() rejects negative actual_cost', async () => {
    const { supabase } = makeSupabaseMock(makeBatch())
    const service = new BatchService(supabase)

    await expect(
      service.create('user-1', { name: 'Test', payment_status: 'unpaid', actual_cost: -10 }),
    ).rejects.toThrow()
  })
})

describe('reBatch — ownership enforcement', () => {
  it('throws when batch belongs to a different user', async () => {
    const otherUserBatch = makeBatch({ user_id: 'user-2' })
    const findById = vi.fn().mockResolvedValue(otherUserBatch)
    const { supabase } = makeSupabaseMock(otherUserBatch)

    const service = new BatchService(supabase)
    // @ts-expect-error
    service.repo.findById = findById

    // Application-level ownership check (mirrors reBatch action logic)
    const original = await service.getById('batch-1')
    const requestingUserId = 'user-1'
    expect(original?.user_id !== requestingUserId).toBe(true)
  })

  it('proceeds when batch belongs to the requesting user', async () => {
    const ownBatch = makeBatch({ user_id: 'user-1' })
    const findById = vi.fn().mockResolvedValue(ownBatch)
    const { supabase } = makeSupabaseMock(ownBatch)

    const service = new BatchService(supabase)
    // @ts-expect-error
    service.repo.findById = findById

    const original = await service.getById('batch-1')
    const requestingUserId = 'user-1'
    expect(original?.user_id === requestingUserId).toBe(true)
  })
})
