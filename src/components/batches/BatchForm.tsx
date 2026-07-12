'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { batchSchema, type BatchFormValues } from '@/schemas/batch.schema'
import { createBatch, updateBatch } from '@/actions/batches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LaundryVendor } from '@/types'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  vendors: LaundryVendor[]
  defaultValues?: Partial<BatchFormValues>
  batchId?: string
  hasPricedItems?: boolean
}

export function BatchForm({ vendors, defaultValues, batchId, hasPricedItems = false }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema) as Resolver<BatchFormValues>,
    defaultValues: { payment_status: 'unpaid', ...defaultValues },
  })

  const selectedVendorId = watch('vendor_id')
  const initialVendorId = defaultValues?.vendor_id ?? null
  const vendorChanged = batchId != null && hasPricedItems && selectedVendorId !== initialVendorId

  async function onSubmit(data: BatchFormValues) {
    const result = batchId
      ? await updateBatch(batchId, data)
      : await createBatch(data)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(batchId ? 'Batch updated' : 'Batch created')
    router.push(`/batches/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Batch name *</Label>
        <Input id="name" placeholder="e.g. Weekly wash – July 2026" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor">Laundry vendor</Label>
        <Select
          defaultValue={defaultValues?.vendor_id ?? undefined}
          onValueChange={(v: string | null) => setValue('vendor_id', !v || v === 'none' ? null : v)}
        >
          <SelectTrigger id="vendor">
            <SelectValue placeholder="Select vendor (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No vendor</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {vendorChanged && (
          <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Existing item prices won&apos;t update automatically. Use &ldquo;Apply vendor prices&rdquo; on the batch after saving.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Any special instructions…" rows={3} {...register('notes')} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {batchId ? 'Save changes' : 'Create batch'}
      </Button>
    </form>
  )
}
