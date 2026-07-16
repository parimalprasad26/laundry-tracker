import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import type { VendorConnectedCustomer } from '@/types'

export function ConnectedCustomersList({ customers }: { customers: VendorConnectedCustomer[] }) {
  if (customers.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No connected customers yet.</p>
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {customers.map(c => (
        <Link key={c.connection_id} href={`/vendor/customers/${c.connection_id}`}>
          <Card className="hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{c.customer_name ?? 'A customer'}</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {c.connected_since ? `Connected ${new Date(c.connected_since).toLocaleDateString()}` : 'Connected'}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
