import { describe, it, expect, vi } from 'vitest'
import { BatchRepository } from '@/repositories/BatchRepository'

describe('BatchRepository.getVendorComparisonStats', () => {
  it('calls the RPC with no arguments — the function derives the user from auth.uid() server-side', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = { rpc } as unknown as ConstructorParameters<typeof BatchRepository>[0]
    const repo = new BatchRepository(supabase)

    await repo.getVendorComparisonStats()

    // Regression guard: this RPC used to accept a client-supplied p_user_id, which let
    // any authenticated user read another user's vendor stats directly via the RPC
    // endpoint. It must never be called with a user-identifying argument again.
    expect(rpc).toHaveBeenCalledWith('get_vendor_comparison_stats')
    expect(rpc.mock.calls[0]).toHaveLength(1)
  })
})
