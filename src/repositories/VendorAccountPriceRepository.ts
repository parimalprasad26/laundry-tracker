import { SupabaseClient } from '@supabase/supabase-js'
import { priceKey } from '@/lib/item-type'
import type { VendorAccountPrice, ItemType } from '@/types'

export type VendorAccountPriceEntry = { item_type: ItemType; custom_type?: string | null; unit_price: number }

export class VendorAccountPriceRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByVendorAccount(vendorAccountId: string): Promise<VendorAccountPrice[]> {
    const { data, error } = await this.supabase
      .from('vendor_account_prices')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .order('item_type')

    if (error) throw error
    return data ?? []
  }

  async getPriceMap(vendorAccountId: string): Promise<Map<string, number>> {
    const prices = await this.findByVendorAccount(vendorAccountId)
    return new Map(prices.map(p => [priceKey(p.item_type, p.custom_type), Number(p.unit_price)]))
  }

  // Standard item types only — custom types are added exclusively via the
  // price-request approval path (VendorPriceRequestService), never directly,
  // so every custom type on a vendor's list has gone through a real request.
  async upsertStandardPrice(vendorAccountId: string, entry: { item_type: ItemType; unit_price: number }): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_account_prices')
      .upsert({
        vendor_account_id: vendorAccountId,
        item_type: entry.item_type,
        custom_type: null,
        unit_price: entry.unit_price,
      }, { onConflict: 'vendor_account_id,item_type,custom_type', ignoreDuplicates: false })
    if (error) throw error
  }

  async countStandardPrices(vendorAccountId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('vendor_account_prices')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_account_id', vendorAccountId)
      .neq('item_type', 'other')
    if (error) throw error
    return count ?? 0
  }

  // Service-role only — called from VendorPriceRequestService.resolve(), the one
  // place a custom-type price is added to a vendor's shared list.
  async upsertCustomPriceServiceRole(vendorAccountId: string, customType: string, unitPrice: number): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_account_prices')
      .upsert({
        vendor_account_id: vendorAccountId,
        item_type: 'other',
        custom_type: customType,
        unit_price: unitPrice,
      }, { onConflict: 'vendor_account_id,item_type,custom_type', ignoreDuplicates: false })
    if (error) throw error
  }
}
