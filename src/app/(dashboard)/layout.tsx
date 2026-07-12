import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { FeedbackButton } from '@/components/layout/FeedbackButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, settingsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    supabase.from('user_settings').select('onboarding_completed').eq('user_id', user.id).maybeSingle(),
  ])

  const profile = profileResult.data
  const needsOnboarding = !settingsResult.data || !settingsResult.data.onboarding_completed
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col shrink-0">
        <AppSidebar profile={profile} />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile header only */}
        <AppHeader profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-7 md:pb-7">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
      <ServiceWorkerRegistrar />
      <FeedbackButton />

      {needsOnboarding && <OnboardingModal firstName={firstName} />}
    </div>
  )
}
