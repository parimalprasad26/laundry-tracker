import Link from 'next/link'
import { WashingMachine } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-3xl bg-foreground flex items-center justify-center">
            <WashingMachine className="h-10 w-10 text-background" />
          </div>
        </div>
        <p className="text-6xl font-black tracking-tight text-foreground mb-2">404</p>
        <h1 className="text-xl font-bold mb-2">This page got lost in the wash</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
