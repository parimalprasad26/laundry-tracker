import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VendorService } from '@/services/VendorService'
import { VendorPriceService } from '@/services/VendorPriceService'
import { BatchService } from '@/services/BatchService'
import { VendorForm } from '@/components/vendors/VendorForm'
import { VendorPriceForm } from '@/components/vendors/VendorPriceForm'
import { VendorPaymentNotes } from '@/components/vendors/VendorPaymentNotes'
import { VendorTurnaroundStats } from '@/components/vendors/VendorTurnaroundStats'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft } from 'lucide-react'
import { BatchRepository } from '@/repositories/BatchRepository'
import { ClosetRepository } from '@/repositories/ClosetRepository'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const vendor = await new VendorService(supabase).getById(id)
  return { title: vendor?.name ?? 'Vendor' }
}

export default async function VendorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [vendor, prices, notedBatches, turnaround, customTypes] = await Promise.all([
    new VendorService(supabase).getById(id),
    new VendorPriceService(supabase).getByVendor(id, user.id),
    new BatchService(supabase).getWithNotesByVendor(id, user.id),
    new BatchRepository(supabase).getTurnaroundStats(user.id, id),
    new ClosetRepository(supabase).getUserCustomTypes(user.id),
  ])

  if (!vendor || vendor.user_id !== user.id) notFound()

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">{vendor.name}</h1>
      </div>

      <VendorForm
        vendorId={vendor.id}
        defaultValues={{
          name: vendor.name,
          phone: vendor.phone,
          address: vendor.address,
          notes: vendor.notes,
        }}
      />

      <Separator />

      <div className="space-y-2">
        <h2 className="font-medium text-sm">Turnaround time</h2>
        <VendorTurnaroundStats
          avgDays={turnaround.avgDays}
          minDays={turnaround.minDays}
          maxDays={turnaround.maxDays}
          count={turnaround.count}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h2 className="font-medium text-sm">Price list</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set the price per item type. Leave blank if this vendor doesn&apos;t handle that type.
            Prices are automatically applied when you add items to a batch with this vendor.
          </p>
        </div>
        <VendorPriceForm vendorId={vendor.id} initialPrices={prices} customTypes={customTypes} />
      </div>

      {notedBatches.length > 0 && (
        <>
          <Separator />
          <VendorPaymentNotes batches={notedBatches} vendorId={vendor.id} />
        </>
      )}
    </div>
  )
}
