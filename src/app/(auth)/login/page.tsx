import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { WashingMachine } from 'lucide-react'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-3xl p-8 shadow-xl shadow-black/5 ring-1 ring-border">
          {/* Branding */}
          <div className="flex flex-col items-center gap-4 text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background">
              <WashingMachine className="h-9 w-9" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Laundry Tracker</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Keep track of every item you send out.<br />Never lose a sock again.
              </p>
            </div>
          </div>

          <GoogleSignInButton />

          <p className="text-center text-xs text-muted-foreground mt-5">
            By signing in you agree to our{' '}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
