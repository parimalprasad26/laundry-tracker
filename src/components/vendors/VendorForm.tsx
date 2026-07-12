'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { vendorSchema, type VendorFormValues } from '@/schemas/vendor.schema'
import { createVendor, updateVendor } from '@/actions/vendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface Props {
  defaultValues?: Partial<VendorFormValues>
  vendorId?: string
}

export function VendorForm({ defaultValues, vendorId }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema) as Resolver<VendorFormValues>,
    defaultValues,
  })

  async function onSubmit(data: VendorFormValues) {
    const result = vendorId
      ? await updateVendor(vendorId, data)
      : await createVendor(data)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(vendorId ? 'Vendor updated' : 'Vendor created')
    router.push('/vendors')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" placeholder="e.g. Sparkling Clean Laundry" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register('phone')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" placeholder="123 Main St, City" {...register('address')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Opening hours, price list…" rows={3} {...register('notes')} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {vendorId ? 'Save changes' : 'Add vendor'}
      </Button>
    </form>
  )
}
