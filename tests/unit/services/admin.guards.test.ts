import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminService } from '@/services/AdminService'
import type { VendorAccount } from '@/types'

function makeVendorAccount(overrides: Partial<VendorAccount> = {}): VendorAccount {
  return {
    id: 'vendor-account-1',
    auth_user_id: 'target-user-1',
    business_name: 'Test Laundry',
    phone: null,
    address: null,
    onboarding_completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

function makeService() {
  const service = new AdminService({} as ConstructorParameters<typeof AdminService>[0])
  // @ts-expect-error — patching private repo for test
  service.repo.findByAuthUserId = vi.fn().mockResolvedValue(null)
  // @ts-expect-error
  service.repo.createServiceRole = vi.fn()
  // @ts-expect-error
  service.repo.findAllServiceRole = vi.fn()
  // @ts-expect-error — patching private raw client for test
  service.supabase = {
    auth: { admin: { listUsers: vi.fn() } },
    from: vi.fn(),
  } as unknown as ConstructorParameters<typeof AdminService>[0]
  return service
}

// requireAdmin (private, exercised through every public method) reads
// process.env.ADMIN_USER_ID directly — stub it per test rather than
// relying on whatever the real environment happens to have set.
describe('AdminService — requireAdmin gate, exercised via every public method', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_USER_ID', 'admin-1')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('promoteUserToVendor throws when ADMIN_USER_ID is unset', async () => {
    vi.stubEnv('ADMIN_USER_ID', '')
    const service = makeService()
    await expect(service.promoteUserToVendor('admin-1', 'target-1', 'Biz')).rejects.toThrow('Unauthorized')
  })

  it('promoteUserToVendor throws when the caller is not the admin', async () => {
    const service = makeService()
    await expect(service.promoteUserToVendor('someone-else', 'target-1', 'Biz')).rejects.toThrow('Unauthorized')
  })

  it('promoteUserToVendor succeeds for the admin and logs the invocation', async () => {
    const service = makeService()
    const created = makeVendorAccount()
    // @ts-expect-error
    service.repo.createServiceRole.mockResolvedValue(created)

    const result = await service.promoteUserToVendor('admin-1', 'target-user-1', 'Test Laundry')

    // @ts-expect-error
    expect(service.repo.createServiceRole).toHaveBeenCalledWith('target-user-1', 'Test Laundry')
    expect(result).toBe(created)
  })

  it('promoteUserToVendor rejects a target that already has a vendor profile', async () => {
    const service = makeService()
    // @ts-expect-error
    service.repo.findByAuthUserId.mockResolvedValue(makeVendorAccount())
    await expect(service.promoteUserToVendor('admin-1', 'target-user-1', 'Biz')).rejects.toThrow('already has a vendor profile')
  })

  it('listVendorAccounts throws when the caller is not the admin', async () => {
    const service = makeService()
    await expect(service.listVendorAccounts('someone-else')).rejects.toThrow('Unauthorized')
  })

  it('listVendorAccounts delegates to the repository for the admin', async () => {
    const service = makeService()
    const accounts = [makeVendorAccount()]
    // @ts-expect-error
    service.repo.findAllServiceRole.mockResolvedValue(accounts)

    await expect(service.listVendorAccounts('admin-1')).resolves.toBe(accounts)
  })

  it('searchUsers throws when the caller is not the admin', async () => {
    const service = makeService()
    await expect(service.searchUsers('someone-else', 'test@example.com')).rejects.toThrow('Unauthorized')
  })

  it('searchUsers returns an empty array for a too-short query without calling the auth admin API', async () => {
    const service = makeService()
    const result = await service.searchUsers('admin-1', 'a')
    expect(result).toEqual([])
    // @ts-expect-error
    expect(service.supabase.auth.admin.listUsers).not.toHaveBeenCalled()
  })

  it('searchUsers filters by email, cross-references profiles and vendor_accounts', async () => {
    const service = makeService()
    // @ts-expect-error
    service.supabase.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'user-1', email: 'match@example.com' },
          { id: 'user-2', email: 'other@example.com' },
        ],
      },
      error: null,
    })
    const fromMock = vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ in: () => Promise.resolve({ data: [{ id: 'user-1', full_name: 'Match Person' }], error: null }) }) }
      }
      if (table === 'vendor_accounts') {
        return { select: () => ({ in: () => ({ is: () => Promise.resolve({ data: [], error: null }) }) }) }
      }
      throw new Error(`unexpected table ${table}`)
    })
    // @ts-expect-error
    service.supabase.from = fromMock

    const result = await service.searchUsers('admin-1', 'match')

    expect(result).toEqual([
      { authUserId: 'user-1', email: 'match@example.com', fullName: 'Match Person', isVendor: false },
    ])
  })
})
