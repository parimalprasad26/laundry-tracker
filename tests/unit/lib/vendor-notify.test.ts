import { describe, it, expect, vi, beforeEach } from 'vitest'

const findActiveByLaundryVendorId = vi.fn()
const findById = vi.fn()
const sendPushToUser = vi.fn()

vi.mock('@/repositories/VendorConnectionRepository', () => ({
  VendorConnectionRepository: vi.fn().mockImplementation(function () { return { findActiveByLaundryVendorId } }),
}))
vi.mock('@/repositories/VendorAccountRepository', () => ({
  VendorAccountRepository: vi.fn().mockImplementation(function () { return { findById } }),
}))
vi.mock('@/lib/push-notify', () => ({ sendPushToUser }))

const { notifyConnectedVendor } = await import('@/lib/vendor-notify')

describe('notifyConnectedVendor', () => {
  beforeEach(() => {
    findActiveByLaundryVendorId.mockReset()
    findById.mockReset()
    sendPushToUser.mockReset()
  })

  const notification = { title: 'Test', body: 'Body', tag: 'test-tag' }

  it('no-ops silently when there is no active connection (private/unconnected vendor)', async () => {
    findActiveByLaundryVendorId.mockResolvedValue(null)
    await notifyConnectedVendor({} as never, 'laundry-vendor-1', 'batch-1', notification)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('no-ops when the connection points at a vendor account that no longer exists', async () => {
    findActiveByLaundryVendorId.mockResolvedValue({ id: 'conn-1', vendor_account_id: 'va-1' })
    findById.mockResolvedValue(null)
    await notifyConnectedVendor({} as never, 'laundry-vendor-1', 'batch-1', notification)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('resolves through vendor_accounts.auth_user_id — never sends using vendor_account_id directly', async () => {
    findActiveByLaundryVendorId.mockResolvedValue({ id: 'conn-1', vendor_account_id: 'va-1' })
    findById.mockResolvedValue({ id: 'va-1', auth_user_id: 'vendor-owner-1' })

    await notifyConnectedVendor({} as never, 'laundry-vendor-1', 'batch-1', notification)

    expect(sendPushToUser).toHaveBeenCalledWith(
      {},
      'vendor-owner-1', // auth.uid(), not 'va-1' (vendor_accounts.id) — these are two different primary keys
      expect.objectContaining({ ...notification, url: '/vendor/customers/conn-1/batch-1' })
    )
  })
})
