import { describe, it, expect, vi } from 'vitest'
import { DisputeService } from '@/services/DisputeService'
import type { BatchDispute, BatchItem, BatchWithStatus, VendorConnection, VendorAccount } from '@/types'

function makeConnection(overrides: Partial<VendorConnection> = {}): VendorConnection {
  return {
    id: 'conn-1',
    user_id: 'customer-1',
    vendor_account_id: 'vendor-account-1',
    laundry_vendor_id: 'laundry-vendor-1',
    status: 'active',
    requested_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
    disconnected_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeVendorAccount(overrides: Partial<VendorAccount> = {}): VendorAccount {
  return {
    id: 'vendor-account-1',
    auth_user_id: 'vendor-owner-1',
    business_name: 'Test Laundry',
    phone: null,
    address: null,
    onboarding_completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

function makeBatchItem(overrides: Partial<BatchItem> = {}): BatchItem {
  return {
    id: 'item-1',
    batch_id: 'batch-1',
    closet_item_id: 'closet-1',
    user_id: 'customer-1',
    quantity_sent: 2,
    quantity_returned: 2,
    damaged_qty: 0,
    missing_qty: 0,
    unit_price: null,
    notes: null,
    returned_at: new Date().toISOString(),
    issue_reported_at: null,
    issue_reported_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
    ...overrides,
  }
}

function makeBatch(overrides: Partial<BatchWithStatus> = {}): BatchWithStatus {
  return {
    id: 'batch-1',
    user_id: 'customer-1',
    vendor_id: 'laundry-vendor-1',
    name: 'Weekly wash',
    notes: null,
    sent_at: new Date().toISOString(),
    returned_at: null,
    closed_at: null,
    estimated_return: null,
    estimated_cost: null,
    actual_cost: null,
    payment_status: 'unpaid',
    price_delta_note: null,
    receipt_path: null,
    version: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
    total_items: 1,
    returned_items: 1,
    calculated_cost: null,
    status: 'in_laundry',
    vendor_name: 'Test Laundry',
    ...overrides,
  }
}

function makeDispute(overrides: Partial<BatchDispute> = {}): BatchDispute {
  return {
    id: 'dispute-1',
    batch_id: 'batch-1',
    batch_item_id: 'item-1',
    user_id: 'customer-1',
    reported_at: new Date().toISOString(),
    damaged_qty: 1,
    description: null,
    dispute_type: 'damage',
    wrong_item_description: null,
    status: 'open',
    resolved_at: null,
    resolution: null,
    raised_by_role: 'vendor',
    vendor_account_id: 'vendor-account-1',
    ...overrides,
  }
}

// Stubs every admin-backed private field directly, bypassing the lazy
// getters' `createAdminClient()` call entirely — mirrors the pattern used
// for VendorConnectionService's reconnect regression test.
function makeService() {
  const service = new DisputeService({} as ConstructorParameters<typeof DisputeService>[0])
  // @ts-expect-error — patching private admin fields for test
  service._adminClient = {}
  // @ts-expect-error
  service._adminConnectionRepo = { findById: vi.fn() }
  // @ts-expect-error
  service._adminVendorAccountRepo = { findById: vi.fn() }
  // @ts-expect-error
  service._adminBatchItemRepo = { findByIdServiceRole: vi.fn() }
  // @ts-expect-error
  service._adminBatchRepo = { findById: vi.fn() }
  // @ts-expect-error
  service._adminRepo = { findOpenByItem: vi.fn(), create: vi.fn(), findById: vi.fn(), resolveServiceRole: vi.fn() }
  // @ts-expect-error
  service._adminInspectionPolicyRepo = { findByUser: vi.fn().mockResolvedValue({ dispute_window_days: 30 }) }
  // @ts-expect-error
  service._adminStateMachine = { logEvent: vi.fn().mockResolvedValue(undefined) }
  return service
}

describe('DisputeService.raiseAsVendor', () => {
  it('throws when the connection does not exist or is not active', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection({ status: 'pending' }))
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('Connection not found')
  })

  it('throws when the caller is not the connection\'s vendor account owner', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('Connection not found')
  })

  it('throws when the batch item does not exist', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(null)
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('Item not found')
  })

  it('throws when the item\'s batch does not belong to this vendor\'s connection', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection({ laundry_vendor_id: 'laundry-vendor-1' }))
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch({ vendor_id: 'a-different-vendor' }))
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('Item not found')
  })

  it('throws when the batch has not been sent yet', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch({ sent_at: null }))
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('has not been sent yet')
  })

  it('throws when the batch is closed and past the dispute window', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch({ status: 'closed', closed_at: fortyDaysAgo }))
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('dispute window closed')
  })

  it('allows raising on a closed batch still within the dispute window', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch({ status: 'closed', closed_at: twoDaysAgo }))
    // @ts-expect-error
    service._adminRepo.findOpenByItem.mockResolvedValue(null)
    const created = makeDispute()
    // @ts-expect-error
    service._adminRepo.create.mockResolvedValue(created)

    const result = await service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })

    expect(result).toBe(created)
  })

  it('throws when the item already has an open dispute', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch())
    // @ts-expect-error
    service._adminRepo.findOpenByItem.mockResolvedValue(makeDispute())
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('already has an open issue')
  })

  it('throws when the item already has a raw damage/missing flag', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem({ damaged_qty: 1 }))
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch())
    // @ts-expect-error
    service._adminRepo.findOpenByItem.mockResolvedValue(null)
    await expect(
      service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', { dispute_type: 'damage', damaged_qty: 1 })
    ).rejects.toThrow('already has a damage report')
  })

  it('creates a vendor-raised dispute against the customer once every guard passes', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminConnectionRepo.findById.mockResolvedValue(makeConnection())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    // @ts-expect-error
    service._adminBatchItemRepo.findByIdServiceRole.mockResolvedValue(makeBatchItem())
    // @ts-expect-error
    service._adminBatchRepo.findById.mockResolvedValue(makeBatch())
    // @ts-expect-error
    service._adminRepo.findOpenByItem.mockResolvedValue(null)
    const created = makeDispute()
    // @ts-expect-error
    service._adminRepo.create.mockResolvedValue(created)

    const result = await service.raiseAsVendor('vendor-owner-1', 'conn-1', 'item-1', {
      dispute_type: 'damage',
      damaged_qty: 1,
      description: 'stain',
    })

    // @ts-expect-error
    expect(service._adminRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        batch_id: 'batch-1',
        batch_item_id: 'item-1',
        user_id: 'customer-1', // the customer, not the vendor
        raised_by_role: 'vendor',
        vendor_account_id: 'vendor-account-1',
      })
    )
    expect(result).toBe(created)
  })
})

describe('DisputeService.resolveAsVendor', () => {
  it('throws when the dispute does not exist', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminRepo.findById.mockResolvedValue(null)
    await expect(service.resolveAsVendor('dispute-1', 'vendor-owner-1', 'Fixed')).rejects.toThrow('Dispute not found')
  })

  it('throws when the dispute was raised by the customer, not a vendor', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminRepo.findById.mockResolvedValue(makeDispute({ raised_by_role: 'customer', vendor_account_id: null }))
    await expect(service.resolveAsVendor('dispute-1', 'vendor-owner-1', 'Fixed')).rejects.toThrow('Dispute not found')
  })

  it('throws when the caller does not own the vendor account that raised it', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminRepo.findById.mockResolvedValue(makeDispute())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(service.resolveAsVendor('dispute-1', 'vendor-owner-1', 'Fixed')).rejects.toThrow('Dispute not found')
  })

  it('resolves the dispute once ownership is verified', async () => {
    const service = makeService()
    // @ts-expect-error
    service._adminRepo.findById.mockResolvedValue(makeDispute())
    // @ts-expect-error
    service._adminVendorAccountRepo.findById.mockResolvedValue(makeVendorAccount())
    const resolved = makeDispute({ status: 'resolved', resolution: 'Fixed' })
    // @ts-expect-error
    service._adminRepo.resolveServiceRole.mockResolvedValue(resolved)

    const result = await service.resolveAsVendor('dispute-1', 'vendor-owner-1', 'Fixed')

    // @ts-expect-error
    expect(service._adminRepo.resolveServiceRole).toHaveBeenCalledWith('dispute-1', 'Fixed', 'resolved')
    expect(result).toBe(resolved)
  })
})
