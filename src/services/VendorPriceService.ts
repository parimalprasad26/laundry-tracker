import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorPriceRepository } from '@/repositories/VendorPriceRepository'
import type { VendorItemPrice, ItemType } from '@/types'

export class VendorPriceService {
  private repo: VendorPriceRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorPriceRepository(supabase)
  }

  async getByVendor(vendorId: string): Promise<VendorItemPrice[]> {
    return this.repo.findByVendor(vendorId)
  }

  async getPriceMap(vendorId: string): Promise<Map<ItemType, number>> {
    return this.repo.getPriceMap(vendorId)
  }

  async save(
    vendorId: string,
    userId: string,
    prices: Array<{ item_type: ItemType; unit_price: number }>
  ): Promise<void> {
    await this.repo.replaceAll(vendorId, userId, prices)
  }
}
