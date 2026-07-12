import { createClient } from '@/lib/supabase/server'
import { VendorService } from '@/services/VendorService'
import { VendorPriceService } from '@/services/VendorPriceService'
import { BatchRepository } from '@/repositories/BatchRepository'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Phone, ChevronRight, Clock, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Vendors' }

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const vendorService = new VendorService(supabase)
  const priceService = new VendorPriceService(supabase)
  const vendors = await vendorService.list(user.id)
  const [priceCountMap, turnaroundMap] = await Promise.all([
    priceService.countByVendors(vendors.map(v => v.id)),
    new BatchRepository(supabase).getTurnaroundStatsByVendor(user.id),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendors</h1>
        <div className="flex items-center gap-2">
          {vendors.length > 1 && (
            <Link href="/vendors/compare" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1.5')}>
              <BarChart2 className="h-4 w-4" />Compare
            </Link>
          )}
          <Link href="/vendors/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="mr-1.5 h-4 w-4" />Add vendor
          </Link>
        </div>
      </div>

      {vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No vendors yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => {
            const stats = turnaroundMap.get(v.id)
            const priceCount = priceCountMap.get(v.id) ?? 0
            return (
              <Link key={v.id} href={`/vendors/${v.id}`}>
                <Card className="hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{v.name}</CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {v.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />{v.phone}
                      </p>
                    )}
                    {v.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />{v.address}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {priceCount > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {priceCount} price{priceCount > 1 ? 's' : ''} set
                        </Badge>
                      )}
                      {stats && (
                        <Badge variant="outline" className="text-[10px] py-0 gap-1">
                          <Clock className="h-2.5 w-2.5" />~{stats.avgDays}d avg
                        </Badge>
                      )}
                    </div>
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
