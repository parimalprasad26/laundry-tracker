import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShieldAlert } from 'lucide-react'

// Not the real security boundary — AdminService.requireAdmin re-checks
// ADMIN_USER_ID independently on every action called from pages under
// this layout, exactly as strictly as this check does. This gate exists
// so an unauthorized visitor can't even load the page and see the user
// search / vendor roster (information disclosure), not to be the sole
// thing standing between them and creating a vendor account.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId || user.id !== adminUserId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-semibold">Admin</span>
          </div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            Back to my account
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        {children}
      </main>
    </div>
  )
}
