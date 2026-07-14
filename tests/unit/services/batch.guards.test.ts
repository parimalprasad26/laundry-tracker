import { describe, it, expect, vi } from 'vitest'
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

function makeService(findByIdResult: BatchWithStatus | null) {
  const service = new BatchService({} as ConstructorParameters<typeof BatchService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findById = vi.fn().mockResolvedValue(findByIdResult)
  return service
}

describe('BatchService.getEditable', () => {
  it('throws when the batch does not exist', async () => {
    const service = makeService(null)
    await expect(service.getEditable('batch-1', 'user-1')).rejects.toThrow('Batch not found')
  })

  it('throws when the batch belongs to a different user', async () => {
    const service = makeService(makeBatch({ user_id: 'user-2' }))
    await expect(service.getEditable('batch-1', 'user-1')).rejects.toThrow('Batch not found')
  })

  it('throws when the batch is returned', async () => {
    const service = makeService(makeBatch({ status: 'returned' }))
    await expect(service.getEditable('batch-1', 'user-1')).rejects.toThrow(
      "Cannot modify a batch with status 'returned'",
    )
  })

  it('throws when the batch is closed', async () => {
    const service = makeService(makeBatch({ status: 'closed' }))
    await expect(service.getEditable('batch-1', 'user-1')).rejects.toThrow(
      "Cannot modify a batch with status 'closed'",
    )
  })

  it('returns the batch when status is draft', async () => {
    const batch = makeBatch({ status: 'draft' })
    const service = makeService(batch)
    await expect(service.getEditable('batch-1', 'user-1')).resolves.toBe(batch)
  })

  it('returns the batch when status is in_laundry', async () => {
    const batch = makeBatch({ status: 'in_laundry' })
    const service = makeService(batch)
    await expect(service.getEditable('batch-1', 'user-1')).resolves.toBe(batch)
  })
})
