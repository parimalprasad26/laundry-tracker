import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BatchService } from '@/services/BatchService'
import { BatchCard } from '@/components/batches/BatchCard'
import { BatchFilters } from '@/components/batches/BatchFilters'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Batches' }

interface Props {
  searchParams: Promise<{ q?: string; status?: string; cursor?: string }>
}

export default async function BatchesPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = new BatchService(supabase)
  const { data: batches, hasMore, nextCursor } = await service.listPage({
    userId: user.id,
    search: params.q,
    status: params.status,
    cursor: params.cursor,
  })

  const nextParams = new URLSearchParams({ ...params, cursor: nextCursor ?? '' }).toString()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Batches</h1>
        <Link href="/batches/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="mr-1.5 h-4 w-4" />New
        </Link>
      </div>

      <Suspense>
        <BatchFilters />
      </Suspense>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No batches found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}

      {hasMore && nextCursor && (
        <div className="flex justify-center pt-2">
          <Link href={`/batches?${nextParams}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Load more
          </Link>
        </div>
      )}
    </div>
  )
}
