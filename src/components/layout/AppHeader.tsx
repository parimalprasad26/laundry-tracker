import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { AppLogo } from './AppLogo'

interface Props {
  profile: { full_name: string | null; avatar_url: string | null } | null
}

export function AppHeader({ profile }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:hidden">
      <AppLogo />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
