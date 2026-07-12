import { SupabaseClient } from '@supabase/supabase-js'
import { priceKey } from '@/lib/item-type'
import type { VendorItemPrice, ItemType } from '@/types'

export type VendorPriceEntry = { item_type: ItemType; custom_type?: string | null; unit_price: number }

export class VendorPriceRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByVendor(vendorId: string): Promise<VendorItemPrice[]> {
    const { data, error } = await this.supabase
      .from('vendor_item_prices')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('item_type')

    if (error) throw error
    return data ?? []
  }

  async getPriceMap(vendorId: string): Promise<Map<string, number>> {
    const prices = await this.findByVendor(vendorId)
    return new Map(prices.map(p => [priceKey(p.item_type, p.custom_type), Number(p.unit_price)]))
  }

  async replaceAll(vendorId: string, userId: string, prices: VendorPriceEntry[]): Promise<void> {
    const { error: delErr } = await this.supabase
      .from('vendor_item_prices')
      .delete()
      .eq('vendor_id', vendorId)

    if (delErr) throw delErr
    if (!prices.length) return

    const { error: insErr } = await this.supabase
      .from('vendor_item_prices')
      .insert(prices.map(p => ({
        vendor_id: vendorId,
        user_id: userId,
        item_type: p.item_type,
        custom_type: p.custom_type ?? null,
        unit_price: p.unit_price,
        created_by: userId,
        updated_by: userId,
      })))

    if (insErr) throw insErr
  }
}
