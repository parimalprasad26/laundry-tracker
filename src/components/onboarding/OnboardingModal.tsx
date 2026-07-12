'use client'

import { useState, useTransition } from 'react'
import { WashingMachine, Shirt, Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import { completeOnboarding } from '@/actions/user-settings'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  firstName: string | null
}

const STEPS = [
  {
    id: 'welcome',
    icon: WashingMachine,
    iconBg: 'bg-foreground',
    iconColor: 'text-background',
    title: (name: string | null) => name ? `Welcome, ${name}` : 'Welcome',
    subtitle: 'Your personal laundry ledger — know exactly what you sent, what came back, and what you paid.',
    body: null,
  },
  {
    id: 'how',
    icon: null,
    iconBg: '',
    iconColor: '',
    title: () => 'Here\'s how it works',
    subtitle: 'Three simple steps, every time you visit the laundry.',
    body: [
      {
        icon: Shirt,
        color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500',
        heading: 'Build your closet',
        text: 'Add your clothes once — shirts, pants, suits. They live in your closet forever.',
      },
      {
        icon: Package,
        color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500',
        heading: 'Create a batch',
        text: 'Each laundry trip is a batch. Pick items from your closet and send them off.',
      },
      {
        icon: CheckCircle2,
        color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500',
        heading: 'Track & settle up',
        text: 'Mark items returned, record what you paid, and spot anything lost or damaged.',
      },
    ],
  },
  {
    id: 'go',
    icon: null,
    iconBg: '',
    iconColor: '',
    title: () => 'Ready to go',
    subtitle: 'Start by adding a few items to your closet, then create your first batch.',
    body: null,
  },
]

export function OnboardingModal({ firstName }: Props) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (!isLast) {
      setStep(s => s + 1)
      return
    }
    startTransition(async () => {
      await completeOnboarding()
      router.refresh()
    })
  }

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm">
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-foreground' : 'w-1.5 bg-border'
              )}
            />
          ))}
        </div>

        <div className="bg-card rounded-3xl p-8 shadow-xl shadow-black/5 ring-1 ring-border min-h-[380px] flex flex-col">
          {/* Step 1: icon */}
          {current.icon && (
            <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center mb-6', current.iconBg)}>
              <current.icon className={cn('h-9 w-9', current.iconColor)} />
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight">{current.title(firstName)}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.subtitle}</p>

          {/* Step 2: feature list */}
          {current.body && (
            <ul className="mt-6 space-y-4 flex-1">
              {current.body.map((item) => (
                <li key={item.heading} className="flex gap-3 items-start">
                  <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', item.color)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.heading}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Step 3: first-action hint */}
          {current.id === 'go' && (
            <div className="mt-6 flex-1 rounded-2xl bg-muted p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your first two steps</p>
              <p className="text-sm">1. Go to <span className="font-semibold">Closet</span> and add a few items of clothing.</p>
              <p className="text-sm">2. Create a <span className="font-semibold">New batch</span> and pick those items.</p>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleNext}
              disabled={isPending}
              className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isPending ? 'Setting up…' : isLast ? 'Get started' : 'Next'}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
