import { describe, it, expect } from 'vitest'
import { batchSchema } from '@/schemas/batch.schema'

describe('batchSchema', () => {
  it('accepts valid input', () => {
    const result = batchSchema.safeParse({ name: 'Test batch', payment_status: 'unpaid' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = batchSchema.safeParse({ name: '', payment_status: 'unpaid' })
    expect(result.success).toBe(false)
  })

  it('rejects negative actual_cost', () => {
    const result = batchSchema.safeParse({ name: 'Test', actual_cost: -1 })
    expect(result.success).toBe(false)
  })
})
