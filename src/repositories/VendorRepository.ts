import { SupabaseClient } from '@supabase/supabase-js'
import type { LaundryVendor } from '@/types'
import type { VendorFormValues } from '@/schemas/vendor.schema'

export class VendorRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(userId: string): Promise<LaundryVendor[]> {
    const { data, error } = await this.supabase
      .from('laundry_vendors')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<LaundryVendor | null> {
    const { data, error } = await this.supabase
      .from('laundry_vendors')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(userId: string, input: VendorFormValues): Promise<LaundryVendor> {
    const { data, error } = await this.supabase
      .from('laundry_vendors')
      .insert({ ...input, user_id: userId, created_by: userId, updated_by: userId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, userId: string, input: VendorFormValues): Promise<LaundryVendor> {
    const { data, error } = await this.supabase
      .from('laundry_vendors')
      .update({ ...input, updated_by: userId })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('laundry_vendors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }
}
