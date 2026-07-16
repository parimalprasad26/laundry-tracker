'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { searchPlatformVendors, requestVendorConnection } from '@/actions/vendor-directory'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, MapPin, Send } from 'lucide-react'
import type { VendorSearchResult } from '@/types'

export function VendorSearchClient() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VendorSearchResult[]>([])
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [isSearching, startSearch] = useTransition()
  const [isRequesting, startRequest] = useTransition()

  function handleSearch(value: string) {
    setQuery(value)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    startSearch(async () => {
      const result = await searchPlatformVendors(value.trim())
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setResults(result.data)
    })
  }

  function handleRequest(vendorAccountId: string) {
    startRequest(async () => {
      const result = await requestVendorConnection(vendorAccountId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setRequestedIds(prev => new Set(prev).add(vendorAccountId))
      toast.success('Connection request sent')
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search vendors by name…"
          className="pl-9"
        />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No vendors found on the platform.</p>
      )}

      <div className="space-y-2.5">
        {results.map(v => {
          const requested = requestedIds.has(v.vendor_account_id)
          return (
            <Card key={v.vendor_account_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{v.business_name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                {v.address ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />{v.address}
                  </p>
                ) : <span />}
                <Button
                  size="sm"
                  variant={requested ? 'outline' : 'default'}
                  disabled={requested || isRequesting}
                  onClick={() => handleRequest(v.vendor_account_id)}
                >
                  {requested ? 'Requested' : <><Send className="mr-1.5 h-3.5 w-3.5" />Request to connect</>}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
