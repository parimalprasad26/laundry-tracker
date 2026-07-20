'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, ListOrdered, Shirt, CalendarDays, History,
  AlertTriangle, BarChart3, Store, Settings2, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'batches', label: 'Batches', icon: ListOrdered },
  { id: 'closet', label: 'Closet', icon: Shirt },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'history', label: 'History', icon: History },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'vendor-side', label: 'Vendor side', icon: Users },
]

export function GuideToc() {
  const [active, setActive] = useState<string>(SECTIONS[0].id)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const targets = SECTIONS
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    if (targets.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-15% 0px -70% 0px' }
    )
    targets.forEach(el => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <>
      {/* Desktop: sticky in-page rail */}
      <nav className="hidden lg:flex lg:flex-col gap-0.5 sticky top-4 self-start w-44 shrink-0">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
              active === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        ))}
      </nav>

      {/* Mobile / tablet: horizontal chip strip */}
      <nav className="lg:hidden flex gap-1.5 overflow-x-auto pb-3 mb-5 border-b -mx-1 px-1">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap',
              active === id ? 'bg-primary/10 text-primary border-transparent' : 'text-muted-foreground border-border'
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </a>
        ))}
      </nav>
    </>
  )
}
