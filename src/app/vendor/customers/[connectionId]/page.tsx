import Link from 'next/link'
import { getCustomerBatches } from '@/actions/vendor-portal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Customer Batches' }

function batchStatusLabel(b: { sent_at: string | null; returned_at: string | null; closed_at: string | null }) {
  if (b.closed_at) return { label: 'Closed', variant: 'outline' as const }
  if (b.returned_at) return { label: 'Returned', variant: 'secondary' as const }
  if (b.sent_at) return { label: 'In laundry', variant: 'default' as const }
  return { label: 'Draft', variant: 'outline' as const }
}

export default async function VendorCustomerBatchesPage({ params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params
  const result = await getCustomerBatches(connectionId)
  const batches = result.success ? result.data : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/vendor/dashboard" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Batches sent to you</h1>
      </div>

      {!result.success && <p className="text-sm text-destructive">{result.error}</p>}

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No batches sent yet.</p>
      ) : (
        <div className="space-y-2.5">
          {batches.map(b => {
            const status = batchStatusLabel(b)
            return (
              <Link key={b.batch_id} href={`/vendor/customers/${connectionId}/${b.batch_id}`}>
                <Card className="hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {b.returned_items}/{b.total_items} items returned
                      {b.sent_at && ` · sent ${new Date(b.sent_at).toLocaleDateString()}`}
                    </p>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
