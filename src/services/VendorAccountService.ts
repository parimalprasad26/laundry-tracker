import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorAccountRepository } from '@/repositories/VendorAccountRepository'
import { VendorAccountPriceRepository } from '@/repositories/VendorAccountPriceRepository'
import { vendorAccountProfileSchema, vendorAccountStandardPriceSchema, type VendorAccountProfileValues } from '@/schemas/vendor-account.schema'
import type { VendorAccount, VendorAccountPrice, VendorSearchResult, ItemType } from '@/types'

// Minimum standard rate-card size before a vendor can go discoverable —
// prevents a bare, unpriced vendor shell from being browsable/connectable
// (plan Finding 8).
const MIN_STANDARD_PRICES_FOR_ONBOARDING = 1

// vendor_accounts has NO authenticated write policy at all (see migration
// 0032) — updateOwnProfile/completeOnboarding below can only succeed when
// this service is constructed with the admin (service-role) client. Read
// methods (getByAuthUserId, getById, search) work with either client —
// RLS already permits them for the regular authenticated client, and the
// admin client bypasses RLS entirely. The action layer decides which
// client to inject; this service never re-derives auth.uid() itself, it
// always checks the caller-supplied authUserId against the row it read.

export class VendorAccountService {
  private repo: VendorAccountRepository
  private priceRepo: VendorAccountPriceRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorAccountRepository(supabase)
    this.priceRepo = new VendorAccountPriceRepository(supabase)
  }

  async getByAuthUserId(authUserId: string): Promise<VendorAccount | null> {
    return this.repo.findByAuthUserId(authUserId)
  }

  async getById(id: string): Promise<VendorAccount | null> {
    return this.repo.findById(id)
  }

  // Throws unless the caller is the vendor account's own owner — mirrors
  // BatchService.getEditable's ownership-guard pattern.
  async requireOwnAccount(id: string, authUserId: string): Promise<VendorAccount> {
    const account = await this.repo.findById(id)
    if (!account || account.auth_user_id !== authUserId) throw new Error('Vendor account not found')
    return account
  }

  async search(query: string): Promise<VendorSearchResult[]> {
    return this.repo.search(query)
  }

  async updateOwnProfile(id: string, authUserId: string, input: VendorAccountProfileValues): Promise<VendorAccount> {
    await this.requireOwnAccount(id, authUserId)
    const validated = vendorAccountProfileSchema.parse(input)
    return this.repo.updateOwnProfile(id, authUserId, validated)
  }

  async listStandardPrices(vendorAccountId: string): Promise<VendorAccountPrice[]> {
    const all = await this.priceRepo.findByVendorAccount(vendorAccountId)
    return all.filter(p => p.item_type !== 'other')
  }

  async setStandardPrice(vendorAccountId: string, authUserId: string, input: { item_type: ItemType; unit_price: number }): Promise<void> {
    await this.requireOwnAccount(vendorAccountId, authUserId)
    const validated = vendorAccountStandardPriceSchema.parse(input)
    await this.priceRepo.upsertStandardPrice(vendorAccountId, validated)
  }

  async isOnboardingComplete(vendorAccountId: string): Promise<boolean> {
    const account = await this.repo.findById(vendorAccountId)
    return account?.onboarding_completed_at != null
  }

  // Vendor-triggered completion, once they've set at least one price — the
  // account only actually becomes discoverable once this is called. Requires
  // this service to have been constructed with the admin client (see class
  // comment) — the "at least one price" gate lives here, in the service, so
  // it can't be skipped by calling the repository method directly.
  async completeOnboarding(vendorAccountId: string, authUserId: string): Promise<void> {
    await this.requireOwnAccount(vendorAccountId, authUserId)
    const priceCount = await this.priceRepo.countStandardPrices(vendorAccountId)
    if (priceCount < MIN_STANDARD_PRICES_FOR_ONBOARDING) {
      throw new Error('Set at least one price on your rate card before going live')
    }
    await this.repo.markOnboardingCompleteServiceRole(vendorAccountId)
  }
}
