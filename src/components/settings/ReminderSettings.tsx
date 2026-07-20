'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { subscribeToPush, unsubscribeFromPush } from '@/actions/push-subscriptions'
import { saveReminderThreshold } from '@/actions/user-settings'
import { urlBase64ToUint8Array } from '@/lib/push-client'
import { cn } from '@/lib/utils'

const THRESHOLD_OPTIONS = [1, 2, 3, 5, 7]

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

export function ReminderSettings({ initialThreshold }: { initialThreshold: number }) {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      setIsLoading(false)
      return
    }

    setPermission(Notification.permission)

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub)
        setIsLoading(false)
      })
    })
  }, [])

  async function handleEnable() {
    if (!('serviceWorker' in navigator)) return

    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') {
      toast.error('Notification permission denied. Enable it in your browser settings.')
      return
    }

    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const json = sub.toJSON()
        const result = await subscribeToPush(
          json.endpoint!,
          json.keys!.p256dh,
          json.keys!.auth
        )

        if (result.success) {
          setSubscribed(true)
          toast.success('Reminders enabled')
        } else {
          toast.error(result.error)
        }
      } catch {
        toast.error('Could not enable reminders. Try again.')
      }
    })
  }

  async function handleDisable() {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await unsubscribeFromPush(sub.endpoint)
        }
        setSubscribed(false)
        toast.success('Reminders disabled')
      } catch {
        toast.error('Could not disable reminders. Try again.')
      }
    })
  }

  async function handleThresholdChange(days: number) {
    setThreshold(days)
    startTransition(async () => {
      const result = await saveReminderThreshold(days)
      if (!result.success) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-medium">Reminders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Get notified when laundry has been out for too long.
        </p>
      </div>
      <Separator />

      {!supported ? (
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Checking status…
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                subscribed ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-muted'
              )}>
                {subscribed
                  ? <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  : <BellOff className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium">{subscribed ? 'Reminders on' : 'Reminders off'}</p>
                <p className="text-xs text-muted-foreground">
                  {permission === 'denied'
                    ? 'Blocked in browser — update site permissions'
                    : subscribed
                      ? 'You\'ll be notified when batches are overdue'
                      : 'Enable to get push notifications'}
                </p>
              </div>
            </div>

            {permission === 'denied' ? null : subscribed ? (
              <Button variant="outline" size="sm" onClick={handleDisable} disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Turn off'}
              </Button>
            ) : (
              <Button size="sm" onClick={handleEnable} disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Turn on'}
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Alert me after</Label>
            <div className="flex gap-2 flex-wrap">
              {THRESHOLD_OPTIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleThresholdChange(d)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    threshold === d
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  )}
                >
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              You&apos;ll also see an alert on the dashboard after this many days.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
