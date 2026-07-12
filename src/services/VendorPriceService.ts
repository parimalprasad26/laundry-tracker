import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorPriceRepository, type VendorPriceEntry } from '@/repositories/VendorPriceRepository'
import type { VendorItemPrice } from '@/types'

export class VendorPriceService {
  private repo: VendorPriceRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorPriceRepository(supabase)
  }

  async getByVendor(vendorId: string): Promise<VendorItemPrice[]> {
    return this.repo.findByVendor(vendorId)
  }

  async countByVendors(vendorIds: string[]): Promise<Map<string, number>> {
    return this.repo.countByVendors(vendorIds)
  }

  async getPriceMap(vendorId: string): Promise<Map<string, number>> {
    return this.repo.getPriceMap(vendorId)
  }

  async save(vendorId: string, userId: string, prices: VendorPriceEntry[]): Promise<void> {
    await this.repo.replaceAll(vendorId, userId, prices)
  }
}
