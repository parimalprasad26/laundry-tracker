import { setClosetItemPhotoStatus } from '@/actions/closet'

export type PhotoUploadStatus = 'pending' | 'uploading' | 'done' | 'failed'

type Listener = (itemId: string, status: PhotoUploadStatus) => void

// DB photo_status is only ever written at the two terminal states (uploaded/failed) —
// 'pending'/'uploading' are in-session UI states only, so a closed tab mid-upload
// leaves the item at 'none' (equivalent to never having attempted a photo) rather
// than stuck showing a stale in-progress badge forever.
class ClosetPhotoQueue {
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(itemId: string, status: PhotoUploadStatus) {
    this.listeners.forEach(l => l(itemId, status))
  }

  enqueue(itemId: string, file: File) {
    this.notify(itemId, 'pending')
    void this.process(itemId, file)
  }

  private async process(itemId: string, file: File) {
    this.notify(itemId, 'uploading')
    try {
      // Signed upload tokens are single-use, so every attempt (including retries)
      // requests a fresh one rather than reusing a stale URL.
      const res = await fetch('/api/upload/closet-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed')
      const { signedUrl, path } = await res.json()

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Upload to storage failed')

      const result = await setClosetItemPhotoStatus(itemId, 'uploaded', path)
      if (!result.success) throw new Error(result.error)

      this.notify(itemId, 'done')
    } catch {
      await setClosetItemPhotoStatus(itemId, 'failed').catch(() => {})
      this.notify(itemId, 'failed')
    }
  }

  retry(itemId: string, file: File) {
    this.enqueue(itemId, file)
  }
}

export const closetPhotoQueue = new ClosetPhotoQueue()
