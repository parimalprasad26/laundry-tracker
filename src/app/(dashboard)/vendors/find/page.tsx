import Link from 'next/link'
import { VendorSearchClient } from '@/components/vendors/VendorSearchClient'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Find a Vendor' }

export default function FindVendorPage() {
  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Find a vendor</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Search vendors who have their own account on the platform. Requesting to connect lets them see batches you send them and set prices directly — nothing changes for vendors you track privately.
      </p>
      <VendorSearchClient />
    </div>
  )
}
