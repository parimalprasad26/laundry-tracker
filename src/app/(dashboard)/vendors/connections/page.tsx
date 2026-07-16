import Link from 'next/link'
import { listMyVendorConnections } from '@/actions/vendor-directory'
import { MyConnectionsList } from '@/components/vendors/MyConnectionsList'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Connection Requests' }

export default async function VendorConnectionsPage() {
  const result = await listMyVendorConnections()
  const connections = result.success ? result.data : []

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Connection requests</h1>
      </div>
      <MyConnectionsList connections={connections} />
    </div>
  )
}
