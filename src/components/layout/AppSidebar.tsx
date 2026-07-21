'use client'

import { LayoutDashboard, ListOrdered, History, Store, Shirt, CalendarDays, Settings2, BarChart3, AlertTriangle, BookOpen } from 'lucide-react'
import { NavLink } from './NavLink'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from './ThemeToggle'
import { AppLogo } from './AppLogo'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/batches', label: 'Batches', icon: ListOrdered },
  { href: '/closet', label: 'Closet', icon: Shirt },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
  { href: '/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/summary', label: 'Summary', icon: BarChart3 },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/settings', label: 'Settings', icon: Settings2 },
  { href: '/guide', label: 'Guide', icon: BookOpen },
]

interface Props {
  profile: { full_name: string | null; avatar_url: string | null } | null
}

export function AppSidebar({ profile }: Props) {
  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5">
        <AppLogo />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2">
          <UserMenu profile={profile} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {profile?.full_name ?? 'Account'}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
