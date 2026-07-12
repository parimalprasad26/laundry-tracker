import type { ItemType } from '@/types'

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  shirt: 'Shirt', pants: 'Pants', dress: 'Dress', jacket: 'Jacket',
  shorts: 'Shorts', socks: 'Socks', underwear: 'Underwear',
  sweater: 'Sweater', suit: 'Suit', other: 'Other',
}

export const BLOCKED_CUSTOM_NAMES = new Set(Object.keys(ITEM_TYPE_LABELS))

export function formatItemType(type: ItemType, customType: string | null | undefined): string {
  if (type === 'other' && customType) return customType
  return ITEM_TYPE_LABELS[type] ?? type
}

export function priceKey(type: ItemType, customType: string | null | undefined): string {
  return type === 'other' && customType ? customType : type
}
