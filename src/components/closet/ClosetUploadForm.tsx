'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compressImage, validateImageFile, ImageValidationError } from '@/lib/image-compress'
import { createClosetItem } from '@/actions/closet'
import { closetPhotoQueue, type PhotoUploadStatus } from '@/lib/closet-photo-queue'
import { formatItemType } from '@/lib/item-type'
import { Camera, ImagePlus, Loader2, X, Check, RotateCw } from 'lucide-react'
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

interface SessionItem {
  id: string
  name: string
  type: ClosetItemFormValues['type']
  customType: string | null
  photoStatus: 'none' | PhotoUploadStatus
  photoFile: File | null
}

interface MutationVars {
  values: ClosetItemFormValues
  photoFile: File | null
  tempId: string
}

export function ClosetUploadForm() {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressed, setCompressed] = useState<File | null>(null)
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([])
  const [inFlightCount, setInFlightCount] = useState(0)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ClosetItemFormValues>({
    resolver: zodResolver(closetItemSchema) as Resolver<ClosetItemFormValues>,
    defaultValues: { type: 'shirt', custom_type: null },
  })
  const { ref: nameFormRef, ...nameFieldProps } = register('name')

  useEffect(() => {
    return closetPhotoQueue.subscribe((itemId, status) => {
      setSessionItems(prev => prev.map(i => (i.id === itemId ? { ...i, photoStatus: status } : i)))
    })
  }, [])

  const mutation = useMutation({
    mutationFn: async (vars: MutationVars) => {
      setInFlightCount(c => c + 1)
      try {
        const result = await createClosetItem(vars.values)
        if (!result.success) throw new Error(result.error)
        return result.data
      } finally {
        setInFlightCount(c => c - 1)
      }
    },
    onSuccess: (created, vars) => {
      setSessionItems(prev => prev.map(i => (i.id === vars.tempId ? { ...i, id: created.id } : i)))
      if (vars.photoFile) closetPhotoQueue.enqueue(created.id, vars.photoFile)
    },
    onError: (error, vars) => {
      setSessionItems(prev => prev.filter(i => i.id !== vars.tempId))
      toast.error(error instanceof Error ? error.message : 'Failed to add item', {
        action: { label: 'Retry', onClick: () => submitItem(vars.values, vars.photoFile) },
      })
    },
    retry: 0,
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

  function submitItem(values: ClosetItemFormValues, photoFile: File | null) {
    const tempId = crypto.randomUUID()
    setSessionItems(prev => [
      {
        id: tempId,
        name: values.name,
        type: values.type,
        customType: values.custom_type ?? null,
        photoStatus: photoFile ? 'pending' : 'none',
        photoFile,
      },
      ...prev,
    ])
    mutation.mutate({ values, photoFile, tempId })
  }

  function onSubmit(values: ClosetItemFormValues) {
    submitItem(values, compressed)

    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setCompressed(null)
    reset({ type: values.type, custom_type: null, name: '', color: '', brand: '' })
    nameInputRef.current?.focus()
  }

  function retryPhoto(item: SessionItem) {
    if (!item.photoFile) return
    closetPhotoQueue.retry(item.id, item.photoFile)
  }

  function handleDone() {
    router.refresh()
    router.push('/closet')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            placeholder="e.g. Blue linen shirt"
            {...nameFieldProps}
            ref={el => { nameFormRef(el); nameInputRef.current = el }}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={watch('type') ?? 'shirt'}
            onValueChange={(v: string | null) => {
              setValue('type', (v ?? 'shirt') as ClosetItemFormValues['type'])
              if (v !== 'other') setValue('custom_type', null)
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {watch('type') === 'other' && (
          <div className="space-y-1.5">
            <Label htmlFor="custom_type">Custom name <span className="text-destructive">*</span></Label>
            <Input
              id="custom_type"
              placeholder="e.g. Kurta, Blazer, Saree"
              {...register('custom_type')}
              onChange={e => setValue('custom_type', e.target.value.toLowerCase().trim() || null)}
            />
            {errors.custom_type && <p className="text-xs text-destructive">{errors.custom_type.message}</p>}
          </div>
        )}

        {/* Photo — optional, de-emphasized */}
        <div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />

          {preview ? (
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setCompressed(null) }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Photo attached — uploads after saving</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="h-10 w-10 rounded-xl border border-dashed border-border hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => libraryRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add a photo <span className="text-muted-foreground/70">(optional)</span>
              </button>
            </div>
          )}
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

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleDone} disabled={inFlightCount > 0} className="flex-1 gap-2">
            {inFlightCount > 0 && <Loader2 className="h-4 w-4 animate-spin" />}
            Done{sessionItems.length > 0 ? ` (${sessionItems.length})` : ''}
          </Button>
          <Button type="submit" className="flex-1">
            Save &amp; add another
          </Button>
        </div>
      </form>

      {sessionItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Added this session ({sessionItems.length})</p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {sessionItems.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                <span className="text-sm truncate">{item.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.photoStatus === 'pending' || item.photoStatus === 'uploading' ? (
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  ) : item.photoStatus === 'done' ? (
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : item.photoStatus === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => retryPhoto(item)}
                      className="flex items-center gap-1 text-destructive text-xs"
                    >
                      <RotateCw className="h-3 w-3" /> Retry photo
                    </button>
                  ) : null}
                  <Badge variant="outline" className="text-xs py-0">
                    {formatItemType(item.type, item.customType)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
