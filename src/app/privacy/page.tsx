import Link from 'next/link'
import { WashingMachine } from 'lucide-react'

export const metadata = { title: 'Privacy Policy | Laundry Tracker' }

const sections = [
  {
    title: 'What we collect',
    body: 'When you sign in with Google we receive your name and email address. Inside the app we store the data you create: closet items, laundry batches, vendor names, and payment amounts. We do not collect payment card details — all costs are entered manually by you.',
  },
  {
    title: 'How we use it',
    body: 'Your data is used solely to provide the service — displaying your batches, calculating your spend, and sending push notifications when you opt in. We do not sell, rent, or share your personal data with third parties for marketing purposes.',
  },
  {
    title: 'Push notifications',
    body: "If you enable push notifications, your browser's push subscription endpoint is stored on our servers. This endpoint is only used to send you reminders about overdue laundry. You can revoke push access at any time from your browser settings or the app's Settings page.",
  },
  {
    title: 'Data storage',
    body: 'All data is stored on Supabase (PostgreSQL), hosted on AWS. Your data is isolated by Row Level Security — no other user can read or write your records. Backups are taken daily with point-in-time recovery enabled.',
  },
  {
    title: 'Error monitoring',
    body: 'We use Sentry to capture application errors. Error reports may include your user ID and the action that failed. They do not include passwords or payment details. Error data is retained for 90 days.',
  },
  {
    title: 'Your rights',
    body: 'You can request a full export or deletion of your data at any time by contacting us. Account deletion removes all your batches, closet items, vendor data, and push subscriptions permanently and cannot be undone.',
  },
  {
    title: 'Cookies',
    body: 'We use a single session cookie to keep you signed in. We do not use tracking cookies or third-party advertising cookies. No cookie banner is shown because we only use strictly necessary cookies.',
  },
  {
    title: 'Contact',
    body: "Questions about this policy? Use the feedback button inside the app or email us directly. We'll respond within 48 hours.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <WashingMachine className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold group-hover:opacity-70 transition-opacity">Laundry Tracker</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated July 12, 2026 · Your data is private and only visible to you.</p>
        </div>

        {/* Sections */}
        <div className="space-y-0 divide-y divide-border rounded-2xl ring-1 ring-border overflow-hidden">
          {sections.map((s) => (
            <div key={s.title} className="bg-card px-6 py-5">
              <h2 className="text-sm font-semibold mb-1.5">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 flex gap-5 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Back to app</Link>
        </div>
      </div>
    </div>
  )
}
