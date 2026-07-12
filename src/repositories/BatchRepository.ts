import { SupabaseClient } from '@supabase/supabase-js'
import type { BatchWithStatus, CursorPage, VendorComparisonStats, SpendPeriodData, BudgetPeriod, MonthlySummary } from '@/types'

const PAGE_SIZE = 20

export class BatchRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<BatchWithStatus | null> {
    const { data, error } = await this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findPage(params: {
    userId: string
    cursor?: string
    status?: string
    vendorId?: string
    search?: string
  }): Promise<CursorPage<BatchWithStatus>> {
    let query = this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (params.status) query = query.eq('status', params.status)
    if (params.vendorId) query = query.eq('vendor_id', params.vendorId)
    if (params.search) {
      query = query.textSearch('search_vector', params.search, { type: 'websearch' })
    }
    if (params.cursor) {
      query = query.lt('created_at', params.cursor)
    }

    const { data, error } = await query
    if (error) throw error

    const hasMore = data.length > PAGE_SIZE
    const items = hasMore ? data.slice(0, PAGE_SIZE) : data
    const nextCursor = hasMore ? items[items.length - 1].created_at : null

    return { data: items, nextCursor, hasMore }
  }

  async create(userId: string, input: Record<string, unknown>): Promise<BatchWithStatus> {
    const { data, error } = await this.supabase
      .from('laundry_batches')
      .insert({ ...input, user_id: userId, created_by: userId, updated_by: userId })
      .select()
      .single()

    if (error) throw error

    return this.findById(data.id) as Promise<BatchWithStatus>
  }

  async update(id: string, userId: string, input: Record<string, unknown>): Promise<BatchWithStatus> {
    const { error } = await this.supabase
      .from('laundry_batches')
      .update({ ...input, updated_by: userId })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return this.findById(id) as Promise<BatchWithStatus>
  }

  async findWithNotesByVendor(vendorId: string, userId: string): Promise<BatchWithStatus[]> {
    const { data, error } = await this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('user_id', userId)
      .not('price_delta_note', 'is', null)
      .order('returned_at', { ascending: false, nullsFirst: false })

    if (error) throw error
    return data ?? []
  }

  async findForMonth(userId: string, year: number, month: number): Promise<BatchWithStatus[]> {
    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month, 1).toISOString()

    const { data, error } = await this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('user_id', userId)
      .or(`and(sent_at.gte.${start},sent_at.lt.${end}),and(returned_at.gte.${start},returned_at.lt.${end})`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  }

  async findOverdue(userId: string, thresholdDays: number): Promise<BatchWithStatus[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - thresholdDays)

    const { data, error } = await this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_laundry')
      .lte('sent_at', cutoff.toISOString())
      .order('sent_at', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  async getMonthlySummary(userId: string, year: number, month: number): Promise<MonthlySummary> {
    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month, 1).toISOString()

    const { data: batches, error: bErr } = await this.supabase
      .from('batch_with_status')
      .select('*')
      .eq('user_id', userId)
      .gte('sent_at', start)
      .lt('sent_at', end)
      .order('sent_at', { ascending: true })

    if (bErr) throw bErr
    if (!batches?.length) {
      return { year, month, batchCount: 0, totalItemsSent: 0, totalItemsReturned: 0, totalSpend: 0, avgTurnaroundDays: null, topVendor: null, damagedCount: 0, missingCount: 0 }
    }

    const batchIds = batches.map(b => b.id)
    const { data: items, error: iErr } = await this.supabase
      .from('batch_items')
      .select('batch_id, quantity_sent, quantity_returned, damaged_qty, missing_qty')
      .in('batch_id', batchIds)
      .is('deleted_at', null)

    if (iErr) throw iErr

    const allItems = items ?? []
    const totalItemsSent = allItems.reduce((s, i) => s + i.quantity_sent, 0)
    const totalItemsReturned = allItems.reduce((s, i) => s + i.quantity_returned, 0)
    const damagedCount = allItems.reduce((s, i) => s + i.damaged_qty, 0)
    const missingCount = allItems.reduce((s, i) => s + i.missing_qty, 0)
    const totalSpend = batches.reduce((s, b) => s + (b.actual_cost ?? 0), 0)

    const turnarounds = batches
      .filter(b => b.sent_at && b.returned_at)
      .map(b => (new Date(b.returned_at!).getTime() - new Date(b.sent_at!).getTime()) / 86400000)
    const avgTurnaroundDays = turnarounds.length
      ? Math.round((turnarounds.reduce((s, d) => s + d, 0) / turnarounds.length) * 10) / 10
      : null

    const vendorCounts = new Map<string, { name: string; count: number }>()
    for (const b of batches) {
      if (!b.vendor_id || !b.vendor_name) continue
      const cur = vendorCounts.get(b.vendor_id) ?? { name: b.vendor_name, count: 0 }
      vendorCounts.set(b.vendor_id, { ...cur, count: cur.count + 1 })
    }
    const topVendor = vendorCounts.size > 0
      ? [...vendorCounts.values()].sort((a, b) => b.count - a.count)[0]
        ? { name: [...vendorCounts.values()].sort((a, b) => b.count - a.count)[0].name, batchCount: [...vendorCounts.values()].sort((a, b) => b.count - a.count)[0].count }
        : null
      : null

    return { year, month, batchCount: batches.length, totalItemsSent, totalItemsReturned, totalSpend, avgTurnaroundDays, topVendor, damagedCount, missingCount }
  }

  async getSpendByPeriod(userId: string, period: BudgetPeriod, count: number): Promise<SpendPeriodData[]> {
    const now = new Date()

    type Bucket = { start: Date; end: Date; label: string; isCurrent: boolean }
    const buckets: Bucket[] = []

    for (let i = count - 1; i >= 0; i--) {
      let start: Date, end: Date, label: string

      if (period === 'weekly') {
        const day = now.getDay()
        const diff = day === 0 ? 6 : day - 1
        const monday = new Date(now)
        monday.setDate(now.getDate() - diff)
        monday.setHours(0, 0, 0, 0)
        start = new Date(monday)
        start.setDate(monday.getDate() - i * 7)
        end = new Date(start)
        end.setDate(start.getDate() + 7)
        label = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()}`
      } else if (period === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        label = start.toLocaleString('default', { month: 'short' })
      } else {
        start = new Date(now.getFullYear() - i, 0, 1)
        end = new Date(now.getFullYear() - i + 1, 0, 1)
        label = String(now.getFullYear() - i)
      }

      buckets.push({ start, end, label, isCurrent: i === 0 })
    }

    const { data, error } = await this.supabase
      .from('laundry_batches')
      .select('sent_at, actual_cost')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('actual_cost', 'is', null)
      .gte('sent_at', buckets[0].start.toISOString())
      .lt('sent_at', buckets[buckets.length - 1].end.toISOString())

    if (error) throw error

    return buckets.map(b => {
      const inBucket = (data ?? []).filter(row => {
        const d = new Date(row.sent_at!)
        return d >= b.start && d < b.end
      })
      return {
        label: b.label,
        spend: inBucket.reduce((s, row) => s + (row.actual_cost ?? 0), 0),
        batchCount: inBucket.length,
        isCurrent: b.isCurrent,
      }
    })
  }

  async getVendorComparisonStats(userId: string): Promise<Map<string, VendorComparisonStats>> {
    const { data, error } = await this.supabase.rpc('get_vendor_comparison_stats', { p_user_id: userId })
    if (error) throw error
    if (!data?.length) return new Map()

    const round1 = (n: number | null) => n != null ? Math.round(Number(n) * 10) / 10 : null

    const result = new Map<string, VendorComparisonStats>()
    for (const row of data) {
      const totalSent = Number(row.total_items_sent)
      const totalDamaged = Number(row.total_damaged)
      const totalMissing = Number(row.total_missing)
      result.set(row.vendor_id, {
        batchCount: Number(row.batch_count),
        avgCost: row.avg_cost != null ? Math.round(Number(row.avg_cost)) : null,
        totalSpend: row.total_spend != null ? Number(row.total_spend) : 0,
        avgTurnaroundDays: round1(row.avg_turnaround_days != null ? Number(row.avg_turnaround_days) : null),
        totalItemsSent: totalSent,
        totalDamaged,
        totalMissing,
        damageRate: totalSent > 0 ? round1((totalDamaged / totalSent) * 100) : null,
        missingRate: totalSent > 0 ? round1((totalMissing / totalSent) * 100) : null,
      })
    }
    return result
  }

  async getTurnaroundStats(userId: string, vendorId?: string): Promise<{
    avgDays: number | null
    minDays: number | null
    maxDays: number | null
    count: number
  }> {
    let query = this.supabase
      .from('laundry_batches')
      .select('sent_at, returned_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('sent_at', 'is', null)
      .not('returned_at', 'is', null)

    if (vendorId) query = query.eq('vendor_id', vendorId)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) return { avgDays: null, minDays: null, maxDays: null, count: 0 }

    const diffs = data.map(r => {
      const ms = new Date(r.returned_at!).getTime() - new Date(r.sent_at!).getTime()
      return ms / (1000 * 60 * 60 * 24)
    })

    const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length
    return {
      avgDays: Math.round(avg * 10) / 10,
      minDays: Math.round(Math.min(...diffs) * 10) / 10,
      maxDays: Math.round(Math.max(...diffs) * 10) / 10,
      count: diffs.length,
    }
  }

  async getTurnaroundStatsByVendor(userId: string): Promise<Map<string, { avgDays: number; count: number }>> {
    const { data, error } = await this.supabase
      .from('laundry_batches')
      .select('vendor_id, sent_at, returned_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('vendor_id', 'is', null)
      .not('sent_at', 'is', null)
      .not('returned_at', 'is', null)

    if (error) throw error

    const groups = new Map<string, number[]>()
    for (const row of data ?? []) {
      if (!row.vendor_id) continue
      const ms = new Date(row.returned_at!).getTime() - new Date(row.sent_at!).getTime()
      const days = ms / (1000 * 60 * 60 * 24)
      if (!groups.has(row.vendor_id)) groups.set(row.vendor_id, [])
      groups.get(row.vendor_id)!.push(days)
    }

    const result = new Map<string, { avgDays: number; count: number }>()
    for (const [vid, diffs] of groups) {
      result.set(vid, {
        avgDays: Math.round((diffs.reduce((s, d) => s + d, 0) / diffs.length) * 10) / 10,
        count: diffs.length,
      })
    }
    return result
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('laundry_batches')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }
}
