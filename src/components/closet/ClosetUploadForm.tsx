'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compressImage, validateImageFile, ImageValidationError } from '@/lib/image-compress'
import { createClosetItem } from '@/actions/closet'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Resolver } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { closetItemSchema, type ClosetItemFormValues } from '@/schemas/closet.schema'

const ITEM_TYPES = [
  { value: 'shirt', label: 'Shirt' },
  { value: 'pants', label: 'Pants' },
  { value: 'dress', label: 'Dress' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'socks', label: 'Socks' },
  { value: 'underwear', label: 'Underwear' },
  { value: 'sweater', label: 'Sweater' },
  { value: 'suit', label: 'Suit' },
  { value: 'other', label: 'Other' },
]

export function ClosetUploadForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressed, setCompressed] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ClosetItemFormValues>({
    resolver: zodResolver(closetItemSchema) as Resolver<ClosetItemFormValues>,
    defaultValues: { type: 'other' },
  })

  async function handleFile(file: File) {
    try { validateImageFile(file) } catch (e) {
      if (e instanceof ImageValidationError) toast.error(e.message)
      return
    }
    const comp = await compressImage(file)
    setCompressed(comp)
    setPreview(URL.createObjectURL(comp))
  }

  async function onSubmit(values: ClosetItemFormValues) {
    setUploading(true)
    try {
      let imagePath: string | null = null

      if (compressed) {
        const res = await fetch('/api/upload/closet-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mimeType: compressed.type, fileSize: compressed.size }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed')
        const { signedUrl, path } = await res.json()

        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': compressed.type },
          body: compressed,
        })
        if (!uploadRes.ok) throw new Error('Upload to storage failed')
        imagePath = path
      }

      startTransition(async () => {
        const result = await createClosetItem({ ...values, primary_image_path: imagePath })
        if (result.success) {
          toast.success('Added to your closet')
          router.push('/closet')
        } else {
          toast.error(result.error)
        }
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const isLoading = uploading || isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Photo picker */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden aspect-square max-w-xs mx-auto">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => { setPreview(null); setCompressed(null) }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square max-w-xs mx-auto rounded-2xl border-2 border-dashed border-border hover:border-foreground/30 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <Camera className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Add a photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to take or upload</p>
            </div>
          </button>
        )}

        {!preview && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mx-auto mt-2 transition-colors',
              preview && 'hidden'
            )}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Choose from library
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
          <Input id="name" placeholder="e.g. Blue linen shirt" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={watch('type') ?? 'other'}
            onValueChange={(v: string | null) => setValue('type', (v ?? 'other') as ClosetItemFormValues['type'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="color">Color</Label>
            <Input id="color" placeholder="e.g. Navy blue" {...register('color')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" placeholder="e.g. Zara" {...register('brand')} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save to closet
      </Button>
    </form>
  )
}
