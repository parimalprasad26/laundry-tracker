import { describe, it, expect, vi } from 'vitest'
import { VendorConnectionService } from '@/services/VendorConnectionService'
import type { VendorConnection, VendorAccount } from '@/types'

function makeConnection(overrides: Partial<VendorConnection> = {}): VendorConnection {
  return {
    id: 'conn-1',
    user_id: 'customer-1',
    vendor_account_id: 'vendor-account-1',
    laundry_vendor_id: null,
    status: 'pending',
    requested_at: new Date().toISOString(),
    responded_at: null,
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

function makeService(connection: VendorConnection | null, vendorAccount: VendorAccount | null) {
  const service = new VendorConnectionService({} as ConstructorParameters<typeof VendorConnectionService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findById = vi.fn().mockResolvedValue(connection)
  // @ts-expect-error — patching private repo for test
  service.vendorAccountRepo.findById = vi.fn().mockResolvedValue(vendorAccount)
  return service
}

describe('VendorConnectionService.requireVendorOwnsConnection', () => {
  // The single highest-value guard in the whole feature (plan Finding 2) —
  // a vendor session must never be able to act on a connection that isn't
  // theirs, regardless of what connection id is supplied.
  it('throws when the connection does not exist', async () => {
    const service = makeService(null, null)
    await expect(service.requireVendorOwnsConnection('conn-1', 'vendor-owner-1')).rejects.toThrow('Connection not found')
  })

  it('throws when the caller is not the vendor account owner', async () => {
    const service = makeService(makeConnection(), makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(service.requireVendorOwnsConnection('conn-1', 'vendor-owner-1')).rejects.toThrow('Connection not found')
  })

  it('returns the connection when the caller genuinely owns the vendor account', async () => {
    const connection = makeConnection()
    const service = makeService(connection, makeVendorAccount())
    await expect(service.requireVendorOwnsConnection('conn-1', 'vendor-owner-1')).resolves.toBe(connection)
  })
})

describe('VendorConnectionService.accept', () => {
  it('throws when the caller is not the vendor account owner (cannot forge acceptance of a request not addressed to them)', async () => {
    const service = makeService(makeConnection(), makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(service.accept('conn-1', 'vendor-owner-1')).rejects.toThrow('Connection not found')
  })

  it('throws when the connection is not pending (cannot re-accept an already-active or rejected connection)', async () => {
    const service = makeService(makeConnection({ status: 'active' }), makeVendorAccount())
    await expect(service.accept('conn-1', 'vendor-owner-1')).rejects.toThrow('Cannot accept a active connection')
  })
})

describe('VendorConnectionService.reject', () => {
  it('throws when the caller is not the vendor account owner', async () => {
    const service = makeService(makeConnection(), makeVendorAccount({ auth_user_id: 'someone-else' }))
    await expect(service.reject('conn-1', 'vendor-owner-1')).rejects.toThrow('Connection not found')
  })

  it('throws when the connection is not pending', async () => {
    const service = makeService(makeConnection({ status: 'rejected' }), makeVendorAccount())
    await expect(service.reject('conn-1', 'vendor-owner-1')).rejects.toThrow('Cannot reject a rejected connection')
  })
})

describe('VendorConnectionService.disconnect', () => {
  it('throws when the caller is not the connection\'s own customer', async () => {
    const service = makeService(makeConnection({ user_id: 'customer-1' }), null)
    await expect(service.disconnect('conn-1', 'a-different-customer')).rejects.toThrow('Connection not found')
  })

  it('dismisses any open vendor-raised dispute so it never gets stuck', async () => {
    // Regression: without this, a vendor-raised issue on a now-disconnected
    // vendor is unresolvable by either party — the customer can't resolve
    // it (only the raising vendor can), and the vendor loses visibility
    // into it once the connection is no longer active.
    const service = makeService(makeConnection({ user_id: 'customer-1', vendor_account_id: 'vendor-account-1' }), null)
    // @ts-expect-error — patching private repo for test
    service.repo.disconnect = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error
    service._adminClient = {}
    // @ts-expect-error
    service._adminBatchItemRepo = { clearPendingPriceRequestsForUserServiceRole: vi.fn().mockResolvedValue(undefined) }
    const dismissOpenVendorRaised = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error
    service._adminDisputeRepo = { dismissOpenVendorRaisedServiceRole: dismissOpenVendorRaised }

    await service.disconnect('conn-1', 'customer-1')

    expect(dismissOpenVendorRaised).toHaveBeenCalledWith('customer-1', 'vendor-account-1')
  })
})

describe('VendorConnectionService.requestConnection — reconnecting after a disconnect', () => {
  // Regression test: a customer who disconnects and later wants to
  // reconnect used to hit "Cannot re-request a disconnected connection" —
  // the status check only allowed re-requesting from 'rejected' or
  // 'cancelled', never 'disconnected', even though nothing about the
  // product design says a disconnect should be permanent.
  it('allows re-requesting a previously disconnected connection', async () => {
    const service = new VendorConnectionService({} as ConstructorParameters<typeof VendorConnectionService>[0])
    const disconnected = makeConnection({ status: 'disconnected' })
    const reRequested = makeConnection({ status: 'pending' })

    // @ts-expect-error — patching private repo for test
    service.vendorAccountRepo.findById = vi.fn().mockResolvedValue(makeVendorAccount())
    // @ts-expect-error — patching private repo for test
    service.repo.findByUserAndVendorAccount = vi.fn().mockResolvedValue(disconnected)
    const reRequestSpy = vi.fn().mockResolvedValue(reRequested)
    // @ts-expect-error — patching private repo for test
    service.repo.reRequest = reRequestSpy
    // @ts-expect-error — stubbing the lazy admin client so the notify call
    // doesn't hit createAdminClient() (which throws without env vars)
    service._adminClient = { from: vi.fn() }

    const result = await service.requestConnection('customer-1', 'vendor-account-1')

    expect(reRequestSpy).toHaveBeenCalledWith('customer-1', 'vendor-account-1')
    expect(result.status).toBe('pending')
  })
})
