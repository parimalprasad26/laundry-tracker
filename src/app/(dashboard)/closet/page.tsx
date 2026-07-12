import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClosetService } from '@/services/ClosetService'
import { ClosetItemCard } from '@/components/closet/ClosetItemCard'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Shirt } from 'lucide-react'

export const metadata = { title: 'My Closet' }

export default async function ClosetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = new ClosetService(supabase)
  const items = await service.list(user.id)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Closet</h1>
        <Link href="/closet/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="mr-1.5 h-4 w-4" />Add item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Shirt className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold">Your closet is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your clothes to track them across laundry batches.
            </p>
          </div>
          <Link href="/closet/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="mr-1.5 h-4 w-4" />Add your first item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(item => (
            <ClosetItemCard key={item.id} item={item} supabaseUrl={supabaseUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
