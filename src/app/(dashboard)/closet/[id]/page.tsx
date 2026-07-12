import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClosetService } from '@/services/ClosetService'
import { publicImageUrl } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ClosetItemActions } from '@/components/closet/ClosetItemActions'
import { ChevronLeft, Shirt } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  shirt: 'Shirt', pants: 'Pants', dress: 'Dress', jacket: 'Jacket',
  shorts: 'Shorts', socks: 'Socks', underwear: 'Underwear',
  sweater: 'Sweater', suit: 'Suit', other: 'Other',
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const service = new ClosetService(supabase)
  const item = await service.getById(id)
  return { title: item?.name ?? 'Item' }
}

export default async function ClosetItemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = new ClosetService(supabase)
  const [item, washCount] = await Promise.all([
    service.getById(id),
    service.countWashed(id),
  ])

  if (!item || item.user_id !== user.id) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const imageUrl = item.primary_image_path
    ? publicImageUrl(supabaseUrl, item.primary_image_path)
    : null

  return (
    <div className="space-y-5 max-w-sm mx-auto">
      <div className="flex items-start gap-2">
        <Link href="/closet" className="text-muted-foreground hover:text-foreground mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold flex-1 truncate">{item.name}</h1>
        <ClosetItemActions itemId={item.id} />
      </div>

      <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{TYPE_LABELS[item.type] ?? item.type}</Badge>
          {item.color && <Badge variant="outline">{item.color}</Badge>}
          {item.brand && <Badge variant="outline">{item.brand}</Badge>}
        </div>

        {washCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Sent to laundry{' '}
            <span className="font-semibold text-foreground">{washCount}×</span>
          </p>
        )}

        {item.notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  )
}
