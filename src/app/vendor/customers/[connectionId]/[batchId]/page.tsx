import Link from 'next/link'
import { getCustomerBatchItems } from '@/actions/vendor-portal'
import { VendorBatchItemCard } from '@/components/vendor-portal/VendorBatchItemCard'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Batch Items' }

export default async function VendorCustomerBatchItemsPage({ params }: { params: Promise<{ connectionId: string; batchId: string }> }) {
  const { connectionId, batchId } = await params
  const result = await getCustomerBatchItems(batchId)
  const items = result.success ? result.data : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/vendor/customers/${connectionId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Items</h1>
      </div>

      {!result.success && <p className="text-sm text-destructive">{result.error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No items on this batch.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <VendorBatchItemCard key={item.batch_item_id} connectionId={connectionId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
