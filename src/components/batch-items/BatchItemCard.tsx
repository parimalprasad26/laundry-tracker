'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setBatchItemReturned, removeBatchItem, updateBatchItemPrice } from '@/actions/batch-items'
import { ReportIssuesSheet } from './ReportIssuesSheet'
import { publicImageUrl } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { buttonVariants } from '@/components/ui/button'
import { CheckCircle2, Circle, Minus, Plus, Loader2, Shirt, MoreVertical, Trash2, AlertTriangle, PackageX } from 'lucide-react'
import type { BatchItemWithClosetItem, BatchStatus } from '@/types'
import { cn } from '@/lib/utils'
import { formatItemType } from '@/lib/item-type'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  item: BatchItemWithClosetItem
  batchStatus: BatchStatus
}

export function BatchItemCard({ item, batchStatus }: Props) {
  const router = useRouter()
  const [returned, setReturned] = useState(item.quantity_returned)
  const [unitPrice, setUnitPrice] = useState<number | null>(item.unit_price)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(item.unit_price != null ? String(item.unit_price) : '')
  const [issuesOpen, setIssuesOpen] = useState(false)
  const priceRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  // Sync local state when server data changes (e.g. after "All returned" refreshes the page)
  useEffect(() => { setReturned(item.quantity_returned) }, [item.quantity_returned])
  useEffect(() => {
    if (!editingPrice) {
      setUnitPrice(item.unit_price)
      setPriceInput(item.unit_price != null ? String(item.unit_price) : '')
    }
  }, [item.unit_price]) // eslint-disable-line react-hooks/exhaustive-deps

  const ci = item.closet_item
  const imageUrl = ci.primary_image_path ? publicImageUrl(SUPABASE_URL, ci.primary_image_path) : null
  const isFullyReturned = returned === item.quantity_sent
  const lineTotal = unitPrice != null ? unitPrice * item.quantity_sent : null
  const hasIssues = item.damaged_qty > 0 || item.missing_qty > 0

  function handleRemove() {
    if (!confirm('Remove this item from the batch?')) return
    startTransition(async () => {
      const result = await removeBatchItem(item.id, item.batch_id)
      if (result.success) {
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function commit(next: number) {
    if (next === returned || next < 0 || next > item.quantity_sent) return
    const prev = returned
    setReturned(next)
    startTransition(async () => {
      const result = await setBatchItemReturned(item.id, item.batch_id, next)
      if (!result.success) {
        setReturned(prev)
        toast.error(result.error)
      }
    })
  }

  function openPriceEdit() {
    setEditingPrice(true)
    setPriceInput(unitPrice != null ? String(unitPrice) : '')
    setTimeout(() => priceRef.current?.select(), 0)
  }

  function commitPrice() {
    const trimmed = priceInput.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)

    if (trimmed !== '' && (isNaN(parsed!) || parsed! < 0)) {
      setPriceInput(unitPrice != null ? String(unitPrice) : '')
      setEditingPrice(false)
      return
    }

    const prev = unitPrice
    setUnitPrice(parsed)
    setEditingPrice(false)

    startTransition(async () => {
      const result = await updateBatchItemPrice(item.id, item.batch_id, parsed)
      if (!result.success) {
        setUnitPrice(prev)
        toast.error(result.error)
      }
    })
  }

  return (
    <Card className={cn(
      'transition-all duration-200',
      isFullyReturned && 'ring-1 ring-emerald-200 dark:ring-emerald-900/60'
    )}>
      <CardContent className="pt-4 space-y-3">
        {/* Item row */}
        <div className="flex items-center gap-3">
          {/* Photo */}
          <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={ci.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Name + type */}
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium text-sm truncate', isFullyReturned && 'text-muted-foreground line-through')}>
              {ci.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-xs py-0">{formatItemType(ci.type, ci.custom_type)}</Badge>
              {ci.color && <span className="text-xs text-muted-foreground">{ci.color}</span>}
              {item.damaged_qty > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 border-amber-300 text-amber-600 dark:text-amber-400 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />{item.damaged_qty} damaged
                </Badge>
              )}
              {item.missing_qty > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 border-red-300 text-red-600 dark:text-red-400 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />{item.missing_qty} missing
                </Badge>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 shrink-0">
            {editingPrice ? (
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <input
                  ref={priceRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  onBlur={commitPrice}
                  onKeyDown={e => { if (e.key === 'Enter') commitPrice(); if (e.key === 'Escape') setEditingPrice(false) }}
                  className="w-20 pl-5 pr-1.5 py-1 text-xs text-right rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={batchStatus !== 'completed' ? openPriceEdit : undefined}
                disabled={batchStatus === 'completed'}
                className={cn(
                  'text-xs tabular-nums text-right min-w-[3rem] px-2 py-1 rounded-lg transition-colors',
                  batchStatus !== 'completed' ? 'hover:bg-muted' : 'cursor-default'
                )}
              >
                {lineTotal != null
                  ? <span className="font-medium">₹{lineTotal.toFixed(2)}</span>
                  : <span className="text-muted-foreground">—</span>
                }
              </button>
            )}

            {/* Actions */}
            {batchStatus !== 'completed' && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isPending}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openPriceEdit}>
                    Edit price
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove from batch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}

        {/* Return control */}
        {item.quantity_sent === 1 ? (
          <button
            onClick={() => commit(isFullyReturned ? 0 : 1)}
            disabled={isPending}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-60',
              isFullyReturned
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : isFullyReturned
                ? <CheckCircle2 className="h-4 w-4" />
                : <Circle className="h-4 w-4" />}
            {isFullyReturned ? 'Returned' : 'Mark as returned'}
          </button>
        ) : (
          <div className={cn(
            'flex items-center justify-between rounded-xl px-4 py-2.5',
            isFullyReturned ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-muted/60'
          )}>
            <div className="flex items-center gap-2">
              {isFullyReturned
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                : isPending
                  ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  : null}
              <span className={cn('text-sm font-medium', isFullyReturned ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>
                {isFullyReturned ? 'All returned' : 'Returned'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => commit(returned - 1)}
                disabled={returned === 0 || isPending}
                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className={cn('text-sm font-semibold tabular-nums w-12 text-center', isFullyReturned && 'text-emerald-700 dark:text-emerald-300')}>
                {returned} / {item.quantity_sent}
              </span>
              <button
                onClick={() => commit(returned + 1)}
                disabled={isFullyReturned || isPending}
                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {/* Issues button — visible only in_laundry */}
        {batchStatus === 'in_laundry' && (
          hasIssues ? (
            <button
              onClick={() => setIssuesOpen(true)}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/25 text-left hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {item.damaged_qty > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />{item.damaged_qty} damaged
                  </span>
                )}
                {item.damaged_qty > 0 && item.missing_qty > 0 && (
                  <span className="text-amber-400 text-xs">·</span>
                )}
                {item.missing_qty > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300">
                    <PackageX className="h-3.5 w-3.5" />{item.missing_qty} missing
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">Edit</span>
            </button>
          ) : (
            <button
              onClick={() => setIssuesOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-dashed border-border"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Report damage or missing
            </button>
          )
        )}
      </CardContent>

      <ReportIssuesSheet
        item={item}
        open={issuesOpen}
        onClose={() => setIssuesOpen(false)}
        onSaved={() => router.refresh()}
      />
    </Card>
  )
}
