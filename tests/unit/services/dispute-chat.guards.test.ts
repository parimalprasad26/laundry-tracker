import { describe, it, expect, vi } from 'vitest'
import { DisputeChatService } from '@/services/DisputeChatService'
import type { DisputeMessage } from '@/types'

function makeMessage(overrides: Partial<DisputeMessage> = {}): DisputeMessage {
  return {
    id: 'msg-1',
    dispute_id: 'dispute-1',
    sender_role: 'vendor',
    sender_user_id: null,
    sender_vendor_account_id: 'vendor-account-1',
    body: 'hello',
    created_at: new Date().toISOString(),
    read_at: null,
    ...overrides,
  }
}

function makeService() {
  const service = new DisputeChatService({} as ConstructorParameters<typeof DisputeChatService>[0])
  // @ts-expect-error — patching private repos for test; RLS is the real
  // enforcement here (migration 0041) — these guards only exist to fail
  // with a clean message instead of a raw Postgres RLS rejection.
  service.messageRepo.create = vi.fn()
  // @ts-expect-error
  service.disputeRepo.getVendorContext = vi.fn()
  return service
}

describe('DisputeChatService.sendAsVendor', () => {
  it('throws when the dispute is not found (vendor has no context for it)', async () => {
    const service = makeService()
    // @ts-expect-error
    service.disputeRepo.getVendorContext.mockResolvedValue(null)
    await expect(service.sendAsVendor('dispute-1', 'vendor-owner-1', 'hi')).rejects.toThrow('Dispute not found')
  })

  it('throws when the dispute is no longer open', async () => {
    const service = makeService()
    // @ts-expect-error
    service.disputeRepo.getVendorContext.mockResolvedValue({
      disputeStatus: 'resolved', connectionActive: true, vendorAccountId: 'vendor-account-1',
    })
    await expect(service.sendAsVendor('dispute-1', 'vendor-owner-1', 'hi')).rejects.toThrow('no longer open')
  })

  it('throws when the connection is no longer active', async () => {
    const service = makeService()
    // @ts-expect-error
    service.disputeRepo.getVendorContext.mockResolvedValue({
      disputeStatus: 'open', connectionActive: false, vendorAccountId: 'vendor-account-1',
    })
    await expect(service.sendAsVendor('dispute-1', 'vendor-owner-1', 'hi')).rejects.toThrow('no longer connected')
  })

  it('sends the message once every guard passes', async () => {
    const service = makeService()
    // @ts-expect-error
    service.disputeRepo.getVendorContext.mockResolvedValue({
      disputeStatus: 'open', connectionActive: true, vendorAccountId: 'vendor-account-1',
    })
    const created = makeMessage()
    // @ts-expect-error
    service.messageRepo.create.mockResolvedValue(created)

    const result = await service.sendAsVendor('dispute-1', 'vendor-owner-1', 'hi there')

    // @ts-expect-error
    expect(service.messageRepo.create).toHaveBeenCalledWith({
      dispute_id: 'dispute-1',
      sender_role: 'vendor',
      sender_vendor_account_id: 'vendor-account-1',
      body: 'hi there',
    })
    expect(result).toBe(created)
  })
})

describe('DisputeChatService.send', () => {
  it('creates a customer message with the caller\'s own user id', async () => {
    const service = makeService()
    const created = makeMessage({ sender_role: 'customer', sender_user_id: 'user-1', sender_vendor_account_id: null })
    // @ts-expect-error
    service.messageRepo.create.mockResolvedValue(created)

    const result = await service.send('dispute-1', 'user-1', 'hello')

    // @ts-expect-error
    expect(service.messageRepo.create).toHaveBeenCalledWith({
      dispute_id: 'dispute-1',
      sender_role: 'customer',
      sender_user_id: 'user-1',
      body: 'hello',
    })
    expect(result).toBe(created)
  })

  it('rejects an empty message body', async () => {
    const service = makeService()
    await expect(service.send('dispute-1', 'user-1', '')).rejects.toThrow()
  })
})
