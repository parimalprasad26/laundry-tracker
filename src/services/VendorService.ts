import type { SupabaseClient } from '@supabase/supabase-js'
import { VendorRepository } from '@/repositories/VendorRepository'
import { vendorSchema, type VendorFormValues } from '@/schemas/vendor.schema'
import type { LaundryVendor } from '@/types'

export class VendorService {
  private repo: VendorRepository

  constructor(supabase: SupabaseClient) {
    this.repo = new VendorRepository(supabase)
  }

  async list(userId: string): Promise<LaundryVendor[]> {
    return this.repo.findAll(userId)
  }

  async getById(id: string): Promise<LaundryVendor | null> {
    return this.repo.findById(id)
  }

  async create(userId: string, input: VendorFormValues): Promise<LaundryVendor> {
    const validated = vendorSchema.parse(input)
    return this.repo.create(userId, validated)
  }

  async update(id: string, userId: string, input: VendorFormValues): Promise<LaundryVendor> {
    const validated = vendorSchema.parse(input)
    return this.repo.update(id, userId, validated)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId)
  }
}
