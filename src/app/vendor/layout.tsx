import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorAccountService } from '@/services/VendorAccountService'
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar'
import { LayoutDashboard, ListChecks, Tag, Users, AlertTriangle } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/vendor/prices', label: 'Rate card', icon: Tag },
  { href: '/vendor/requests', label: 'Price requests', icon: ListChecks },
]

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The vendor-status check happens here, at the layout level — not in
  // proxy.ts — to avoid an extra DB round-trip on every request app-wide
  // (see the vendor portal plan's routing section).
  const vendorAccount = await new VendorAccountService(supabase).getByAuthUserId(user.id)
  if (!vendorAccount) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="font-semibold">{vendorAccount.business_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/guide#vendor-side" className="text-xs text-muted-foreground hover:text-foreground">
              Guide
            </Link>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
              Switch to my personal account
            </Link>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-4 flex gap-1 -mb-px overflow-x-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border whitespace-nowrap"
            >
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto p-4">
        {vendorAccount.onboarding_completed_at == null && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Set at least one price on your rate card to appear in customer search.
          </div>
        )}
        {children}
      </main>
      <ServiceWorkerRegistrar />
    </div>
  )
}
