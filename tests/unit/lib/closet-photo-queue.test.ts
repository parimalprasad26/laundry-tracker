import { describe, it, expect, vi, beforeEach } from 'vitest'
import { closetPhotoQueue } from '@/lib/closet-photo-queue'
import { setClosetItemPhotoStatus } from '@/actions/closet'

vi.mock('@/actions/closet', () => ({
  setClosetItemPhotoStatus: vi.fn(),
}))

function makeFile() {
  return new File(['x'], 'a.jpg', { type: 'image/jpeg' })
}

describe('closetPhotoQueue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(setClosetItemPhotoStatus).mockReset()
    global.fetch = vi.fn()
  })

  it('emits pending -> uploading -> done and persists photo_status=uploaded with the storage path', async () => {
    const events: string[] = []
    const unsub = closetPhotoQueue.subscribe((id, status) => events.push(`${id}:${status}`))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedUrl: 'https://signed', path: 'closet/u1/a.jpg' }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)
    vi.mocked(setClosetItemPhotoStatus).mockResolvedValue({ success: true, data: {} as never })

    closetPhotoQueue.enqueue('item-1', makeFile())

    await vi.waitFor(() => expect(events).toContain('item-1:done'))

    expect(events).toEqual(['item-1:pending', 'item-1:uploading', 'item-1:done'])
    expect(setClosetItemPhotoStatus).toHaveBeenCalledWith('item-1', 'uploaded', 'closet/u1/a.jpg')
    unsub()
  })

  it('emits failed and persists photo_status=failed when the storage PUT fails', async () => {
    const events: string[] = []
    const unsub = closetPhotoQueue.subscribe((id, status) => events.push(`${id}:${status}`))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedUrl: 'https://signed', path: 'closet/u1/a.jpg' }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
    vi.mocked(setClosetItemPhotoStatus).mockResolvedValue({ success: true, data: {} as never })

    closetPhotoQueue.enqueue('item-2', makeFile())

    await vi.waitFor(() => expect(events).toContain('item-2:failed'))

    expect(events).toEqual(['item-2:pending', 'item-2:uploading', 'item-2:failed'])
    expect(setClosetItemPhotoStatus).toHaveBeenCalledWith('item-2', 'failed')
    unsub()
  })

  it('retry requests a fresh signed URL rather than reusing the previous one', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedUrl: 'https://signed-1', path: 'p1' }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response) // first attempt's PUT fails
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedUrl: 'https://signed-2', path: 'p2' }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response) // retry's PUT succeeds
    vi.mocked(setClosetItemPhotoStatus).mockResolvedValue({ success: true, data: {} as never })

    const events: string[] = []
    const unsub = closetPhotoQueue.subscribe((id, status) => events.push(`${id}:${status}`))

    const file = makeFile()
    closetPhotoQueue.enqueue('item-3', file)
    await vi.waitFor(() => expect(events).toContain('item-3:failed'))

    closetPhotoQueue.retry('item-3', file)
    await vi.waitFor(() => expect(events).toContain('item-3:done'))

    // 4 fetch calls total: sign+PUT for the first attempt, sign+PUT again for the retry —
    // confirms the retry re-requested a signed URL instead of reusing the first one.
    expect(global.fetch).toHaveBeenCalledTimes(4)
    expect(setClosetItemPhotoStatus).toHaveBeenLastCalledWith('item-3', 'uploaded', 'p2')
    unsub()
  })
})
