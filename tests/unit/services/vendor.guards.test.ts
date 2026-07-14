import { describe, it, expect, vi } from 'vitest'
import { VendorService } from '@/services/VendorService'
import type { LaundryVendor } from '@/types'

function makeVendor(overrides: Partial<LaundryVendor> = {}): LaundryVendor {
  return {
    id: 'vendor-1',
    user_id: 'user-1',
    name: 'Test Vendor',
    phone: null,
    address: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_by: 'user-1',
    ...overrides,
  }
}

function makeService(findByIdResult: LaundryVendor | null) {
  const service = new VendorService({} as ConstructorParameters<typeof VendorService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findById = vi.fn().mockResolvedValue(findByIdResult)
  return service
}

describe('VendorService.requireOwned', () => {
  // VendorRepository.findById isn't scoped by user_id in code — ownership is enforced by
  // RLS at the DB layer, which resolves null for both a nonexistent vendor and one the
  // caller doesn't own. requireOwned must fail closed on either case.
  it('throws when the vendor does not exist or is not owned by the caller', async () => {
    const service = makeService(null)
    await expect(service.requireOwned('vendor-1')).rejects.toThrow('Vendor not found')
  })

  it('returns the vendor when found', async () => {
    const vendor = makeVendor()
    const service = makeService(vendor)
    await expect(service.requireOwned('vendor-1')).resolves.toBe(vendor)
  })
})
