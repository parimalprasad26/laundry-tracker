import { createClient } from '@/lib/supabase/server'
import { VendorService } from '@/services/VendorService'
import { BatchRepository } from '@/repositories/BatchRepository'
import { VendorComparisonTable } from '@/components/vendors/VendorComparisonTable'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Compare Vendors' }

export default async function VendorComparePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [vendors, statsMap] = await Promise.all([
    new VendorService(supabase).list(user.id),
    new BatchRepository(supabase).getVendorComparisonStats(user.id),
  ])

  const rows = vendors.map(v => ({
    vendor: v,
    stats: statsMap.get(v.id) ?? null,
  }))

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Compare vendors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Based on completed batches with returned items</p>
        </div>
      </div>

      <VendorComparisonTable rows={rows} />
    </div>
  )
}
