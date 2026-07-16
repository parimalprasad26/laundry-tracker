import { describe, it, expect, vi } from 'vitest'
import { VendorAccountService } from '@/services/VendorAccountService'
import type { VendorAccount, VendorAccountPrice } from '@/types'

function makeVendorAccount(overrides: Partial<VendorAccount> = {}): VendorAccount {
  return {
    id: 'vendor-account-1',
    auth_user_id: 'vendor-owner-1',
    business_name: 'Test Laundry',
    phone: null,
    address: null,
    onboarding_completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

function makePrice(overrides: Partial<VendorAccountPrice> = {}): VendorAccountPrice {
  return {
    id: 'price-1',
    vendor_account_id: 'vendor-account-1',
    item_type: 'shirt',
    custom_type: null,
    unit_price: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
    ...overrides,
  }
}

function makeService(vendorAccount: VendorAccount | null, prices: VendorAccountPrice[]) {
  const service = new VendorAccountService({} as ConstructorParameters<typeof VendorAccountService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findById = vi.fn().mockResolvedValue(vendorAccount)
  // @ts-expect-error — patching private repo for test
  service.repo.markOnboardingCompleteServiceRole = vi.fn().mockResolvedValue(undefined)
  // @ts-expect-error — patching private repo for test
  service.priceRepo.countStandardPrices = vi.fn().mockImplementation(async () => {
    // Mirrors the real repository query: count rows where item_type != 'other'
    // — regression test for a bug where this was instead written as
    // item_type = 'other', which meant a vendor could never actually
    // complete onboarding no matter how many standard prices they saved.
    return prices.filter(p => p.item_type !== 'other').length
  })
  return service
}

describe('VendorAccountService.completeOnboarding', () => {
  it('succeeds once standard (non-custom) prices exist on the rate card', async () => {
    const service = makeService(makeVendorAccount(), [makePrice({ item_type: 'shirt' }), makePrice({ item_type: 'pants' })])
    await expect(service.completeOnboarding('vendor-account-1', 'vendor-owner-1')).resolves.toBeUndefined()
  })

  it('throws when no prices have been set at all', async () => {
    const service = makeService(makeVendorAccount(), [])
    await expect(service.completeOnboarding('vendor-account-1', 'vendor-owner-1'))
      .rejects.toThrow('Set at least one price on your rate card before going live')
  })

  it('does not count custom-type prices toward the standard rate-card requirement', async () => {
    // Custom prices only ever arrive via the price-request approval path, not
    // the onboarding rate-card editor — a vendor with only a custom price and
    // no standard ones should still be blocked from going live.
    const service = makeService(makeVendorAccount(), [makePrice({ item_type: 'other', custom_type: 'Kurta' })])
    await expect(service.completeOnboarding('vendor-account-1', 'vendor-owner-1'))
      .rejects.toThrow('Set at least one price on your rate card before going live')
  })

  it('throws when the caller does not own the vendor account', async () => {
    const service = makeService(makeVendorAccount({ auth_user_id: 'someone-else' }), [makePrice()])
    await expect(service.completeOnboarding('vendor-account-1', 'vendor-owner-1')).rejects.toThrow('Vendor account not found')
  })
})
