'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListOrdered, Shirt, CalendarDays, History, BarChart2, Store, Settings, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Home',     icon: LayoutDashboard },
  { href: '/batches',    label: 'Batches',  icon: ListOrdered },
  { href: '/closet',     label: 'Closet',   icon: Shirt },
  { href: '/calendar',   label: 'Calendar', icon: CalendarDays },
  { href: '/history',    label: 'History',  icon: History },
  { href: '/issues',     label: 'Issues',   icon: AlertTriangle },
  { href: '/summary',    label: 'Summary',  icon: BarChart2 },
  { href: '/vendors',    label: 'Vendors',  icon: Store },
  { href: '/settings',   label: 'Settings', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex overflow-x-auto scrollbar-none">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex shrink-0 flex-col items-center gap-1 py-2.5 px-4 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'h-6 w-6 flex items-center justify-center rounded-lg transition-all',
                active && 'bg-foreground text-background'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn(active ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
