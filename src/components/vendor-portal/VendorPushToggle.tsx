'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subscribeToPush, unsubscribeFromPush } from '@/actions/push-subscriptions'
import { urlBase64ToUint8Array } from '@/lib/push-client'
import { cn } from '@/lib/utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

// Same subscribe/unsubscribe mechanism as the customer-facing
// ReminderSettings, minus the reminder-threshold section (a customer-only
// concept tied to user_settings.reminder_threshold_days — doesn't apply to
// a vendor). subscribeToPush/unsubscribeFromPush key everything off
// auth.uid(), so this works unmodified for a vendor's own session.
export function VendorPushToggle() {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
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
        const result = await subscribeToPush(json.endpoint!, json.keys!.p256dh, json.keys!.auth)

        if (result.success) {
          setSubscribed(true)
          toast.success('Notifications enabled')
        } else {
          toast.error(result.error)
        }
      } catch {
        toast.error('Could not enable notifications. Try again.')
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
        toast.success('Notifications disabled')
      } catch {
        toast.error('Could not disable notifications. Try again.')
      }
    })
  }

  if (!supported || isLoading) return null

  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3 mb-5">
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
          <p className="text-sm font-medium">{subscribed ? 'Notifications on' : 'Notifications off'}</p>
          <p className="text-xs text-muted-foreground">
            {permission === 'denied'
              ? 'Blocked in browser — update site permissions'
              : subscribed
                ? "You'll be notified when a customer sends, collects, or reports damage"
                : 'Enable to get notified about connected customers\' activity'}
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
  )
}
