import Link from 'next/link'
import { WashingMachine } from 'lucide-react'

export const metadata = { title: 'Terms of Service | Laundry Tracker' }

const sections = [
  {
    title: 'Acceptance',
    body: 'By signing in and using Laundry Tracker you agree to these terms. If you do not agree, do not use the service. Continued use after we post changes constitutes acceptance of those changes.',
  },
  {
    title: 'What the service is',
    body: 'Laundry Tracker is a personal tool for tracking clothing sent to laundry services. It is provided for personal, non-commercial use. You may not resell, sublicense, or provide access to the service to third parties.',
  },
  {
    title: 'Your account',
    body: 'You sign in through your Google account. You are responsible for all activity that occurs under your account. Contact us immediately if you believe your account has been accessed without your authorisation.',
  },
  {
    title: 'Acceptable use',
    body: "You may not use the service to store illegal content, attempt to access another user's data, reverse-engineer the application, send automated requests that degrade performance, or circumvent any security or access controls. We reserve the right to suspend accounts that violate this policy.",
  },
  {
    title: 'Data and availability',
    body: 'We take reasonable steps to keep your data safe and the service available, but we do not guarantee uptime or data retention. You are responsible for keeping your own records of important financial information. The service is provided "as is" without warranty of any kind, express or implied.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the maximum extent permitted by applicable law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability for any claim is limited to the amount you paid us in the 12 months preceding the claim, or ₹100, whichever is greater.',
  },
  {
    title: 'Termination',
    body: 'You may stop using the service at any time. We may suspend or terminate your access if you violate these terms or if the service is discontinued. On termination, your right to use the service ends immediately. You may request deletion of your data before or after termination.',
  },
  {
    title: 'Changes to these terms',
    body: 'We may update these terms from time to time. We will note the date of the last update at the top of this page. Your continued use of the service after changes are posted constitutes your acceptance of the new terms.',
  },
  {
    title: 'Governing law',
    body: 'These terms are governed by the laws of India. Any disputes arising from these terms or your use of the service are subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.',
  },
]

export default function TermsPage() {
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
          <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated July 12, 2026 · Please read these terms before using the app.</p>
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
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Back to app</Link>
        </div>
      </div>
    </div>
  )
}
