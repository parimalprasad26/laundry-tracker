'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { addItemsToBatch } from '@/actions/batch-items'
import { publicImageUrl } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Shirt, Check, Plus, Loader2 } from 'lucide-react'
import type { ClosetItem, MissingCustomPrice } from '@/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  batchId: string
  existingClosetItemIds: string[]
  open: boolean
  onClose: () => void
  onMissingPrices?: (missing: MissingCustomPrice[]) => void
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export function ClosetPicker({ batchId, existingClosetItemIds, open, onClose, onMissingPrices }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('closet_items')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [open])

  function toggle(id: string) {
    if (existingClosetItemIds.includes(id)) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleConfirm() {
    if (!selected.size) return
    startTransition(async () => {
      const result = await addItemsToBatch(batchId, [...selected])
      if (result.success) {
        toast.success(`${selected.size} item${selected.size > 1 ? 's' : ''} added to batch`)
        if (result.data.missingCustomPrices.length > 0 && onMissingPrices) {
          onClose()
          onMissingPrices(result.data.missingCustomPrices)
        } else {
          router.refresh()
          onClose()
        }
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" showCloseButton className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Add items from closet</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Shirt className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-sm">Your closet is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Add clothes to your closet first.</p>
              </div>
              <Link href="/closet/new" onClick={onClose}>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />Add to closet
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {items.map(item => {
                const alreadyAdded = existingClosetItemIds.includes(item.id)
                const isSelected = selected.has(item.id)
                const imageUrl = item.primary_image_path
                  ? publicImageUrl(SUPABASE_URL, item.primary_image_path)
                  : null

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    disabled={alreadyAdded}
                    className={cn(
                      'relative rounded-xl overflow-hidden ring-2 transition-all text-left',
                      isSelected ? 'ring-foreground' : 'ring-transparent',
                      alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:ring-foreground/30'
                    )}
                  >
                    <div className="aspect-square bg-muted">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt className="h-7 w-7 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
                      {item.color && <p className="text-[10px] text-muted-foreground truncate">{item.color}</p>}
                    </div>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-foreground flex items-center justify-center">
                        <Check className="h-3 w-3 text-background" />
                      </div>
                    )}
                    {alreadyAdded && (
                      <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                        Added
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-4 pb-6 pt-3 border-t">
          <Button
            onClick={handleConfirm}
            disabled={!selected.size || isPending}
            className="w-full gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {selected.size > 0 ? `Add ${selected.size} item${selected.size > 1 ? 's' : ''}` : 'Select items'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
