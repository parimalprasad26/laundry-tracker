import { describe, it, expect, vi, afterEach } from 'vitest'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'
import type { BatchWithStatus, InspectionPolicy } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString()
}

function makeBatch(overrides: Partial<BatchWithStatus> = {}): BatchWithStatus {
  return {
    id: 'batch-1',
    user_id: 'user-1',
    name: 'Test batch',
    vendor_id: null,
    vendor_name: null,
    notes: null,
    sent_at: isoDaysAgo(10),
    returned_at: null,
    closed_at: null,
    estimated_return: null,
    estimated_cost: null,
    actual_cost: null,
    receipt_path: null,
    version: 0,
    calculated_cost: 200,
    payment_status: 'unpaid',
    price_delta_note: null,
    status: 'returned',
    total_items: 3,
    returned_items: 3,
    created_at: isoDaysAgo(10),
    updated_at: isoDaysAgo(10),
    created_by: 'user-1',
    updated_by: 'user-1',
    ...overrides,
  }
}

function makePolicy(overrides: Partial<InspectionPolicy> = {}): InspectionPolicy {
  return {
    user_id: 'user-1',
    inspection_window_days: 7,
    dispute_window_days: 14,
    auto_close_days: 30,
    updated_at: isoDaysAgo(10),
    ...overrides,
  }
}

function makeService(policy: InspectionPolicy) {
  const service = new InspectionPolicyService({} as ConstructorParameters<typeof InspectionPolicyService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findByUser = vi.fn().mockResolvedValue(policy)
  return service
}

describe('InspectionPolicyService.isDamageReportable', () => {
  it('blocks a draft batch — never sent', async () => {
    const service = makeService(makePolicy())
    const result = await service.isDamageReportable(makeBatch({ status: 'draft' }), 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/not been sent/i)
  })

  it('blocks a batch still in laundry', async () => {
    const service = makeService(makePolicy())
    const result = await service.isDamageReportable(makeBatch({ status: 'in_laundry' }), 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/still at the vendor/i)
  })

  it('allows reporting within the inspection window after return', async () => {
    const service = makeService(makePolicy({ inspection_window_days: 7 }))
    const batch = makeBatch({ status: 'returned', returned_at: isoDaysAgo(2) })
    const result = await service.isDamageReportable(batch, 'user-1')
    expect(result.allowed).toBe(true)
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it('blocks reporting once the inspection window has expired', async () => {
    const service = makeService(makePolicy({ inspection_window_days: 7 }))
    const batch = makeBatch({ status: 'returned', returned_at: isoDaysAgo(10) })
    const result = await service.isDamageReportable(batch, 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.suggestDispute).toBe(true)
  })

  it('anchors the inspection window to now when returned_at is null', async () => {
    const service = makeService(makePolicy({ inspection_window_days: 7 }))
    const batch = makeBatch({ status: 'returned', returned_at: null })
    const result = await service.isDamageReportable(batch, 'user-1')
    expect(result.allowed).toBe(true)
  })

  it('directs a closed batch within the dispute window to open a dispute instead', async () => {
    const service = makeService(makePolicy({ dispute_window_days: 14 }))
    const batch = makeBatch({ status: 'closed', closed_at: isoDaysAgo(2) })
    const result = await service.isDamageReportable(batch, 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.suggestDispute).toBe(true)
  })

  it('blocks a closed batch entirely once the dispute window has also expired', async () => {
    const service = makeService(makePolicy({ dispute_window_days: 14 }))
    const batch = makeBatch({ status: 'closed', closed_at: isoDaysAgo(20) })
    const result = await service.isDamageReportable(batch, 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.suggestDispute).toBeFalsy()
    expect(result.reason).toMatch(/dispute window closed/i)
  })
})

describe('InspectionPolicyService.isDisputeEligible', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects non-closed batches outright', async () => {
    const service = makeService(makePolicy())
    const result = await service.isDisputeEligible(makeBatch({ status: 'returned' }), 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/only closed batches/i)
  })

  it('allows a dispute within the window after closing', async () => {
    const service = makeService(makePolicy({ dispute_window_days: 14 }))
    const batch = makeBatch({ status: 'closed', closed_at: isoDaysAgo(5) })
    const result = await service.isDisputeEligible(batch, 'user-1')
    expect(result.allowed).toBe(true)
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it('rejects a dispute once the window has expired', async () => {
    const service = makeService(makePolicy({ dispute_window_days: 14 }))
    const batch = makeBatch({ status: 'closed', closed_at: isoDaysAgo(20) })
    const result = await service.isDisputeEligible(batch, 'user-1')
    expect(result.allowed).toBe(false)
  })

  it('treats the deadline as exclusive-past — the exact boundary instant is still eligible', async () => {
    // Frozen clock: closedAt is fixed, "now" at evaluation time is fixed too, so the
    // deadline (closedAt + 14d) lands exactly on "now" with zero drift from test execution
    // time — isAfter(now, deadline) must be false, so this must still be allowed. A >= vs >
    // boundary bug here would silently foreclose disputes a day early for every user.
    vi.useFakeTimers()
    const now = new Date('2026-02-01T12:00:00.000Z')
    vi.setSystemTime(now)
    const closedAt = new Date(now.getTime() - 14 * DAY_MS).toISOString()

    const service = makeService(makePolicy({ dispute_window_days: 14 }))
    const batch = makeBatch({ status: 'closed', closed_at: closedAt })
    const result = await service.isDisputeEligible(batch, 'user-1')

    expect(result.allowed).toBe(true)
  })
})
