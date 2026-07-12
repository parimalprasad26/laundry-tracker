import { cn } from '@/lib/utils'

function IconMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#2563EB" />
      {/* Control panel */}
      <rect x="5" y="5" width="26" height="8" rx="2.5" fill="white" opacity="0.12" />
      <circle cx="10" cy="9" r="2.2" fill="white" />
      <circle cx="16" cy="9" r="1.5" fill="white" opacity="0.55" />
      <circle cx="21" cy="9" r="1" fill="white" opacity="0.35" />
      {/* Divider */}
      <line x1="5" y1="14.5" x2="31" y2="14.5" stroke="white" strokeWidth="1" opacity="0.18" />
      {/* Door outer ring */}
      <circle cx="18" cy="24" r="9.5" fill="none" stroke="white" strokeWidth="2" />
      {/* Door inner ring */}
      <circle cx="18" cy="24" r="6" fill="none" stroke="white" strokeWidth="1.4" opacity="0.55" />
      {/* Glass fill */}
      <circle cx="18" cy="24" r="6" fill="white" opacity="0.08" />
      {/* Water wave */}
      <path
        d="M13 25.5 Q15.5 23 18 25.5 Q20.5 28 23 25.5"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Bubble highlight */}
      <circle cx="15" cy="21.5" r="1.2" fill="white" opacity="0.35" />
    </svg>
  )
}

export function AppLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <IconMark className="h-9 w-9 shrink-0" />
      {!collapsed && (
        <div className="leading-none">
          <span className="font-bold text-[15px] tracking-tight">Laundry</span>
          <span className="font-bold text-[15px] tracking-tight text-blue-600 dark:text-blue-400">Tracker</span>
        </div>
      )}
    </div>
  )
}

export function AppLogoCompact() {
  return <IconMark className="h-7 w-7 shrink-0" />
}
