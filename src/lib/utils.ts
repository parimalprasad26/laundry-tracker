import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null, fallback = '—') {
  if (!date) return fallback
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelative(date: string | null, fallback = '—') {
  if (!date) return fallback
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatCurrency(amount: number | null, fallback = '—') {
  if (amount == null) return fallback
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatPrice(amount: number | null, fallback = '—') {
  if (amount == null) return fallback
  return `₹${amount.toFixed(2)}`
}

export function storagePath(userId: string, batchId: string, itemId: string, filename: string) {
  return `users/${userId}/batches/${batchId}/items/${itemId}/${filename}`
}

export function thumbnailPath(userId: string, batchId: string, itemId: string) {
  return storagePath(userId, batchId, itemId, 'thumb.jpg')
}

export function closetStoragePath(userId: string, filename: string) {
  return `users/${userId}/closet/${filename}`
}

export function publicImageUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/laundry-images/${path}`
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
