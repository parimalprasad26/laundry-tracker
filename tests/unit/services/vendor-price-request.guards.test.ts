import { describe, it, expect, vi } from 'vitest'
import { VendorPriceRequestService } from '@/services/VendorPriceRequestService'
import type { VendorPriceRequest, VendorAccount } from '@/types'

function makeRequest(overrides: Partial<VendorPriceRequest> = {}): VendorPriceRequest {
  return {
    id: '11111111-1111-1111-8111-111111111111',
    vendor_account_id: 'vendor-account-1',
    custom_type: 'Kurta',
    status: 'pending',
    requested_by_user_id: 'customer-1',
    resolved_unit_price: null,
    resolved_at: null,
    requested_at: new Date().toISOString(),
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

function makeService(request: VendorPriceRequest | null, vendorAccount: VendorAccount | null) {
  const service = new VendorPriceRequestService({} as ConstructorParameters<typeof VendorPriceRequestService>[0])
  // adminRepo/adminVendorAccountRepo are lazy getters backed by _adminRepo/
  // _adminVendorAccountRepo (see VendorPriceRequestService) — patch the
  // backing field directly, since the getter short-circuits on a truthy
  // value and never calls createAdminClient().
  // @ts-expect-error — patching private field for test
  service._adminRepo = { findById: vi.fn().mockResolvedValue(request) }
  // @ts-expect-error — patching private field for test
  service._adminVendorAccountRepo = { findById: vi.fn().mockResolvedValue(vendorAccount) }
  return service
}

describe('VendorPriceRequestService.resolve', () => {
  // The resolution write touches batch_items directly (deliberately bypasses
  // BatchService.getEditable per plan Finding 3) — this ownership check is
  // the only thing standing between "any vendor" and "the vendor this
  // request was actually addressed to."
  it('throws when the request does not exist', async () => {
    const service = makeService(null, null)
    await expect(service.resolve('11111111-1111-1111-8111-111111111111', 'vendor-owner-1', 50)).rejects.toThrow('Price request not found')
  })

  it('throws when the request is already resolved', async () => {
    const service = makeService(makeRequest({ status: 'approved' }), makeVendorAccount())
    await expect(service.resolve('11111111-1111-1111-8111-111111111111', 'vendor-owner-1', 50)).rejects.toThrow('Price request not found')
  })

  it('throws when the caller does not own the vendor account the request belongs to', async () => {
    const service = makeService(makeRequest(), makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(service.resolve('11111111-1111-1111-8111-111111111111', 'vendor-owner-1', 50)).rejects.toThrow('Price request not found')
  })

  it('rejects a negative or invalid price before touching the database', async () => {
    const service = makeService(makeRequest(), makeVendorAccount())
    await expect(service.resolve('11111111-1111-1111-8111-111111111111', 'vendor-owner-1', -5)).rejects.toThrow()
  })
})
