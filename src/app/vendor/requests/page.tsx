import { listPendingPriceRequests } from '@/actions/vendor-portal'
import { PriceRequestsClient } from '@/components/vendor-portal/PriceRequestsClient'

export const metadata = { title: 'Price Requests' }

export default async function VendorRequestsPage() {
  const result = await listPendingPriceRequests()
  const requests = result.success ? result.data : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Price requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Custom items your rate card doesn&apos;t cover yet. Setting a price here adds it to your rate card permanently.
        </p>
      </div>
      <PriceRequestsClient requests={requests} />
    </div>
  )
}
