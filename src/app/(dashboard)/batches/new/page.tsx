import { createClient } from '@/lib/supabase/server'
import { VendorService } from '@/services/VendorService'
import { BatchForm } from '@/components/batches/BatchForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'New Batch' }

export default async function NewBatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const vendors = await new VendorService(supabase).list(user.id)

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/batches" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">New batch</h1>
      </div>
      <BatchForm vendors={vendors} />
    </div>
  )
}
