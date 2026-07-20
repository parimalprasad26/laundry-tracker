import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminService } from '@/services/AdminService'
import { AdminVendorSearch } from '@/components/admin/AdminVendorSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Vendor Onboarding' }

export default async function AdminVendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const vendors = await new AdminService(createAdminClient()).listVendorAccounts(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vendor onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search for a user by email and promote them to a vendor account. Invite-only — this is the only way a vendor account gets created.
        </p>
      </div>

      <AdminVendorSearch />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Existing vendors ({vendors.length})
        </h2>
        {vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No vendor accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {vendors.map(v => (
              <Card key={v.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.business_name}</p>
                    <p className="text-xs text-muted-foreground">Created {formatDate(v.created_at)}</p>
                  </div>
                  <Badge variant={v.onboarding_completed_at ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                    {v.onboarding_completed_at ? 'Onboarded' : 'No prices set'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
