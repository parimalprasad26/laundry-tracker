import { createClient } from '@/lib/supabase/server'
import { BatchService } from '@/services/BatchService'
import { BatchCard } from '@/components/batches/BatchCard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = { title: 'History' }

interface Props {
  searchParams: Promise<{ cursor?: string }>
}

export default async function HistoryPage({ searchParams }: Props) {
  const { cursor } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = new BatchService(supabase)
  const { data: batches, hasMore, nextCursor } = await service.listPage({
    userId: user.id,
    status: 'closed',
    cursor,
  })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">History</h1>
      <p className="text-sm text-muted-foreground">All closed laundry batches.</p>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No closed batches yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}

      {hasMore && nextCursor && (
        <div className="flex justify-center pt-2">
          <Link href={`/history?cursor=${nextCursor}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Load more
          </Link>
        </div>
      )}
    </div>
  )
}
