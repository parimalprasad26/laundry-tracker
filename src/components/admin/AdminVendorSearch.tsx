'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { searchUsers, promoteUserToVendor } from '@/actions/admin'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'
import type { AdminUserSearchResult } from '@/types'

export function AdminVendorSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUserSearchResult[] | null>(null)
  const [searchPending, startSearch] = useTransition()
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [promotePending, startPromote] = useTransition()

  function handleSearch() {
    if (query.trim().length < 2) {
      toast.error('Enter at least 2 characters')
      return
    }
    startSearch(async () => {
      const result = await searchUsers(query.trim())
      if (result.success) {
        setResults(result.data)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handlePromote(authUserId: string) {
    const name = businessName.trim()
    if (!name) {
      toast.error('Enter a business name')
      return
    }
    startPromote(async () => {
      const result = await promoteUserToVendor(authUserId, name)
      if (result.success) {
        toast.success(`${name} promoted to vendor`)
        setResults(prev => prev?.map(r => r.authUserId === authUserId ? { ...r, isVendor: true } : r) ?? null)
        setPromotingId(null)
        setBusinessName('')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          placeholder="Search by email…"
          className="text-sm"
        />
        <Button onClick={handleSearch} disabled={searchPending} size="icon" className="shrink-0">
          {searchPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results != null && (
        results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No matching users.</p>
        ) : (
          <div className="space-y-2">
            {results.map(r => (
              <Card key={r.authUserId}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.fullName ?? r.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    {r.isVendor ? (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Already a vendor</Badge>
                    ) : promotingId !== r.authUserId ? (
                      <Button size="sm" variant="outline" onClick={() => setPromotingId(r.authUserId)} className="shrink-0">
                        Promote
                      </Button>
                    ) : null}
                  </div>

                  {promotingId === r.authUserId && (
                    <div className="flex gap-2">
                      <Input
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="Business name"
                        className="text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handlePromote(r.authUserId)}
                        disabled={promotePending}
                        className="shrink-0"
                      >
                        {promotePending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPromotingId(null); setBusinessName('') }}
                        disabled={promotePending}
                        className="shrink-0"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
