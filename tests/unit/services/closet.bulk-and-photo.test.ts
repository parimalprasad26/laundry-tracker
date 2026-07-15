import { describe, it, expect, vi } from 'vitest'
import { ClosetService } from '@/services/ClosetService'
import type { ClosetItem } from '@/types'
import type { ClosetItemFormValues } from '@/schemas/closet.schema'

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

describe('ClosetService.bulkCreate', () => {
  it('validates every input through closetItemSchema before delegating to the repo', async () => {
    const service = makeService()
    const repoBulkCreate = vi.fn().mockResolvedValue([makeClosetItem()])
    // @ts-expect-error — patching private repo for test
    service.repo.bulkCreate = repoBulkCreate

    const inputs: ClosetItemFormValues[] = [{ name: 'Blue shirt', type: 'shirt', custom_type: null }]
    await service.bulkCreate('user-1', inputs)

    expect(repoBulkCreate).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ name: 'Blue shirt', type: 'shirt' }),
    ])
  })

  it('rejects the whole batch if any single item fails validation', async () => {
    const service = makeService()
    const repoBulkCreate = vi.fn()
    // @ts-expect-error
    service.repo.bulkCreate = repoBulkCreate

    const inputs: ClosetItemFormValues[] = [
      { name: 'Valid item', type: 'shirt', custom_type: null },
      { name: '', type: 'shirt', custom_type: null }, // empty name fails schema
    ]

    await expect(service.bulkCreate('user-1', inputs)).rejects.toThrow()
    expect(repoBulkCreate).not.toHaveBeenCalled()
  })
})

describe('ClosetService.setPhotoStatus', () => {
  it('passes the image path through when marking a photo uploaded', async () => {
    const service = makeService()
    const repoUpdate = vi.fn().mockResolvedValue(makeClosetItem({ photo_status: 'uploaded' }))
    // @ts-expect-error
    service.repo.updatePhotoStatus = repoUpdate

    await service.setPhotoStatus('closet-1', 'user-1', 'uploaded', 'closet/user-1/photo.jpg')

    expect(repoUpdate).toHaveBeenCalledWith('closet-1', 'user-1', 'uploaded', 'closet/user-1/photo.jpg')
  })

  it('marks failed without requiring an image path', async () => {
    const service = makeService()
    const repoUpdate = vi.fn().mockResolvedValue(makeClosetItem({ photo_status: 'failed' }))
    // @ts-expect-error
    service.repo.updatePhotoStatus = repoUpdate

    await service.setPhotoStatus('closet-1', 'user-1', 'failed')

    expect(repoUpdate).toHaveBeenCalledWith('closet-1', 'user-1', 'failed', undefined)
  })
})
