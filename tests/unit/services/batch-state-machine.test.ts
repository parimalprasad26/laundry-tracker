import { describe, it, expect, vi } from 'vitest'
import { BatchStateMachineService } from '@/services/BatchStateMachineService'
import type { BatchEvent } from '@/types'

function makeEvent(overrides: Partial<BatchEvent> = {}): BatchEvent {
  return {
    id: 'event-1',
    batch_id: 'batch-1',
    user_id: 'user-1',
    event_type: 'batch.closed',
    payload: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeUpdateMock() {
  const eq2 = vi.fn().mockResolvedValue({ error: null })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const update = vi.fn().mockReturnValue({ eq: eq1 })
  return { update, eq1, eq2 }
}

function makeService(updateMock: ReturnType<typeof makeUpdateMock>) {
  const supabase = {
    from: vi.fn().mockReturnValue({ update: updateMock.update }),
  } as unknown as ConstructorParameters<typeof BatchStateMachineService>[0]
  return new BatchStateMachineService(supabase)
}

describe('BatchStateMachineService.closeBatch', () => {
  it('scopes the update by id and user_id, then logs a batch.closed event', async () => {
    const updateMock = makeUpdateMock()
    const service = makeService(updateMock)
    const logEvent = vi.fn().mockResolvedValue(makeEvent())
    service.logEvent = logEvent

    await service.closeBatch('batch-1', 'user-1')

    expect(updateMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ updated_by: 'user-1' }),
    )
    expect(updateMock.eq1).toHaveBeenCalledWith('id', 'batch-1')
    expect(updateMock.eq2).toHaveBeenCalledWith('user_id', 'user-1')
    expect(logEvent).toHaveBeenCalledWith('batch-1', 'user-1', 'batch.closed', expect.any(Object))
  })

  it('does not log an event if the update fails', async () => {
    const updateMock = makeUpdateMock()
    updateMock.eq2.mockResolvedValue({ error: new Error('db error') })
    const service = makeService(updateMock)
    const logEvent = vi.fn()
    service.logEvent = logEvent

    await expect(service.closeBatch('batch-1', 'user-1')).rejects.toThrow('db error')
    expect(logEvent).not.toHaveBeenCalled()
  })
})

describe('BatchStateMachineService.autoCloseBatch', () => {
  it('scopes the update by id and user_id, then logs a batch.auto_closed event (distinct from a manual close)', async () => {
    const updateMock = makeUpdateMock()
    const service = makeService(updateMock)
    const logEvent = vi.fn().mockResolvedValue(makeEvent({ event_type: 'batch.auto_closed' }))
    service.logEvent = logEvent

    await service.autoCloseBatch('batch-1', 'user-1')

    expect(updateMock.eq1).toHaveBeenCalledWith('id', 'batch-1')
    expect(updateMock.eq2).toHaveBeenCalledWith('user_id', 'user-1')
    expect(logEvent).toHaveBeenCalledWith('batch-1', 'user-1', 'batch.auto_closed', expect.any(Object))
  })
})
