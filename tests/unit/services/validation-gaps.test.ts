import { describe, it, expect, vi } from 'vitest'
import { UserSettingsService } from '@/services/UserSettingsService'
import { DisputeService } from '@/services/DisputeService'
import { VendorPriceService } from '@/services/VendorPriceService'
import { InspectionPolicyService } from '@/services/InspectionPolicyService'

describe('UserSettingsService.saveBudget — validation is actually wired in', () => {
  it('rejects a negative budget instead of reaching the repository', async () => {
    const service = new UserSettingsService({} as ConstructorParameters<typeof UserSettingsService>[0])
    const repoSave = vi.fn()
    // @ts-expect-error — patching private repo for test
    service.repo.save = repoSave

    await expect(service.saveBudget('user-1', -100, 'monthly')).rejects.toThrow()
    expect(repoSave).not.toHaveBeenCalled()
  })
})

describe('DisputeService.open — validation is actually wired in', () => {
  it('rejects a zero-damaged-qty claim instead of reaching the repository', async () => {
    const service = new DisputeService({} as ConstructorParameters<typeof DisputeService>[0])
    const repoCreate = vi.fn()
    // @ts-expect-error
    service.repo.create = repoCreate

    await expect(
      service.open('batch-1', 'item-1', 'user-1', { damaged_qty: 0 })
    ).rejects.toThrow()
    expect(repoCreate).not.toHaveBeenCalled()
  })
})

describe('VendorPriceService.save — validation is actually wired in', () => {
  it('rejects a negative unit_price instead of reaching the repository', async () => {
    const service = new VendorPriceService({} as ConstructorParameters<typeof VendorPriceService>[0])
    const repoReplaceAll = vi.fn()
    // @ts-expect-error
    service.repo.replaceAll = repoReplaceAll

    await expect(
      service.save('vendor-1', 'user-1', [{ item_type: 'shirt', unit_price: -5 }])
    ).rejects.toThrow()
    expect(repoReplaceAll).not.toHaveBeenCalled()
  })
})

describe('InspectionPolicyService.savePolicy — validation is actually wired in', () => {
  it('rejects a zero-day window instead of reaching the repository', async () => {
    const service = new InspectionPolicyService({} as ConstructorParameters<typeof InspectionPolicyService>[0])
    const repoSave = vi.fn()
    // @ts-expect-error
    service.repo.save = repoSave

    await expect(
      service.savePolicy('user-1', { inspection_window_days: 0 })
    ).rejects.toThrow()
    expect(repoSave).not.toHaveBeenCalled()
  })
})
