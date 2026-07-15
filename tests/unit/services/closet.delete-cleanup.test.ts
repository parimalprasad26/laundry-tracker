import { describe, it, expect, vi } from 'vitest'
import { ClosetService } from '@/services/ClosetService'
import type { ClosetItem } from '@/types'

function makeClosetItem(overrides: Partial<ClosetItem> = {}): ClosetItem {
  return {
    id: 'closet-1',
    user_id: 'user-1',
    name: 'Shirt',
    type: 'shirt',
    custom_type: null,
    color: null,
    brand: null,
    notes: null,
    primary_image_path: null,
    photo_status: 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    updated_by: 'user-1',
    ...overrides,
  }
}

function makeService() {
  return new ClosetService({} as ConstructorParameters<typeof ClosetService>[0])
}

describe('ClosetService.delete', () => {
  it('deletes the associated storage object when the item has a photo', async () => {
    const service = makeService()
    const item = makeClosetItem({ primary_image_path: 'closet/user-1/photo.jpg' })
    // @ts-expect-error — patching private members for test
    service.repo.findById = vi.fn().mockResolvedValue(item)
    // @ts-expect-error
    service.repo.softDelete = vi.fn().mockResolvedValue(undefined)
    const deleteFile = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error
    service.storage.deleteFile = deleteFile

    await service.delete('closet-1', 'user-1')

    expect(deleteFile).toHaveBeenCalledWith('closet/user-1/photo.jpg')
  })

  it('skips storage cleanup entirely when the item has no photo', async () => {
    const service = makeService()
    const item = makeClosetItem({ primary_image_path: null })
    // @ts-expect-error
    service.repo.findById = vi.fn().mockResolvedValue(item)
    // @ts-expect-error
    service.repo.softDelete = vi.fn().mockResolvedValue(undefined)
    const deleteFile = vi.fn()
    // @ts-expect-error
    service.storage.deleteFile = deleteFile

    await service.delete('closet-1', 'user-1')

    expect(deleteFile).not.toHaveBeenCalled()
  })

  it('still soft-deletes the item even if storage cleanup fails', async () => {
    const service = makeService()
    const item = makeClosetItem({ primary_image_path: 'closet/user-1/photo.jpg' })
    // @ts-expect-error
    service.repo.findById = vi.fn().mockResolvedValue(item)
    const softDelete = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error
    service.repo.softDelete = softDelete
    // @ts-expect-error
    service.storage.deleteFile = vi.fn().mockRejectedValue(new Error('storage unavailable'))

    await expect(service.delete('closet-1', 'user-1')).resolves.toBeUndefined()
    expect(softDelete).toHaveBeenCalledWith('closet-1', 'user-1')
  })
})
