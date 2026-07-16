import { SupabaseClient } from '@supabase/supabase-js'
import type { VendorPriceRequest } from '@/types'

export class VendorPriceRequestRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<VendorPriceRequest | null> {
    const { data, error } = await this.supabase
      .from('vendor_price_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findPendingForVendorAndType(vendorAccountId: string, customType: string): Promise<VendorPriceRequest | null> {
    const { data, error } = await this.supabase
      .from('vendor_price_requests')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .eq('custom_type', customType)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findPendingForVendorAccount(vendorAccountId: string): Promise<VendorPriceRequest[]> {
    const { data, error } = await this.supabase
      .from('vendor_price_requests')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  // Customer's own session — RLS requires an active connection to this vendor.
  async create(vendorAccountId: string, customType: string, requestedByUserId: string): Promise<VendorPriceRequest> {
    const { data, error } = await this.supabase
      .from('vendor_price_requests')
      .insert({ vendor_account_id: vendorAccountId, custom_type: customType, requested_by_user_id: requestedByUserId, status: 'pending' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Service-role only — resolution also fans out to vendor_account_prices and
  // every waiting batch_item, none of which the vendor's own session can write.
  async resolveServiceRole(id: string, unitPrice: number): Promise<VendorPriceRequest> {
    const { data, error } = await this.supabase
      .from('vendor_price_requests')
      .update({ status: 'approved', resolved_unit_price: unitPrice, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw error
    return data
  }
}
