import Link from 'next/link'
import { publicImageUrl } from '@/lib/utils'
import { Shirt } from 'lucide-react'
import type { ClosetItem } from '@/types'
import { cn } from '@/lib/utils'
import { formatItemType } from '@/lib/item-type'

interface Props {
  item: ClosetItem
  washCount?: number
  supabaseUrl: string
  className?: string
}

export function ClosetItemCard({ item, washCount, supabaseUrl, className }: Props) {
  const imageUrl = item.primary_image_path
    ? publicImageUrl(supabaseUrl, item.primary_image_path)
    : null

  return (
    <Link href={`/closet/${item.id}`}>
      <div className={cn('group rounded-2xl bg-card ring-1 ring-border hover:ring-foreground/20 hover:shadow-md shadow-sm transition-all duration-150 overflow-hidden cursor-pointer', className)}>
        {/* Photo */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shirt className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          {washCount !== undefined && washCount > 0 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
              {washCount}×
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatItemType(item.type, item.custom_type)}{item.color ? ` · ${item.color}` : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
