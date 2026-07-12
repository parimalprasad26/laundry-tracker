import imageCompression from 'browser-image-compression'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './utils'

export class ImageValidationError extends Error {}

export function validateImageFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageValidationError(`File type ${file.type} is not allowed. Use JPEG, PNG, WebP, or HEIC.`)
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageValidationError(`File is too large. Maximum size is 10 MB.`)
  }
}

export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })
  return new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
  })
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = url
  })
}
