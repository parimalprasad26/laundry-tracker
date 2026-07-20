import { GuideToc } from '@/components/guide/GuideToc'
import { BatchStatusBadge } from '@/components/batches/BatchStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ListOrdered, Shirt, CalendarDays, History, AlertTriangle, BarChart3, Store, Settings2,
  Send, PackageCheck, ClipboardCheck, RotateCcw, CheckCircle2,
  Search, Link2, Check, X, Tag, ListChecks, Users, Bell, type LucideIcon,
} from 'lucide-react'

export const metadata = { title: 'Guide' }

function SectionHead({ icon: Icon, title, where }: { icon: LucideIcon; title: string; where: string }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground mt-0.5">{where}</p>
      </div>
    </div>
  )
}

function Callouts({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[0.65rem] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

/** A non-interactive stand-in for a real button, styled with the exact same
 * classes so it looks identical — rendered as a span, not a Button, since
 * it does nothing when clicked and shouldn't take keyboard focus. */
function FakeButton({ icon: Icon, children, variant = 'default', size = 'sm' }: {
  icon?: LucideIcon
  children: React.ReactNode
  variant?: 'default' | 'outline'
  size?: 'sm' | 'default'
}) {
  return (
    <span className={cn(buttonVariants({ variant, size }), 'pointer-events-none gap-1.5')}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

function DashedButton({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-muted-foreground border border-dashed border-border">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  )
}

export default function GuidePage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wide text-primary">Start here</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">How Laundry Tracker works</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Every screen below is drawn to match the real app — same colors, same buttons, same icons.
          Use the menu to jump straight to what you need.
        </p>
      </div>

      <div className="lg:flex lg:gap-10 lg:items-start">
        <GuideToc />

        <div className="flex-1 min-w-0 max-w-2xl space-y-14">

          {/* Quickstart */}
          <section>
            <h2 className="text-base font-bold mb-3">Your first three steps</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                ['Add a few clothes to Closet', 'Optional — saves retyping items every trip.'],
                ['Start a Batch', "Pick what you're sending this time."],
                ['Send it, then track it', "It's followed until it's back and paid for."],
              ].map(([title, desc], i) => (
                <Card key={title}>
                  <CardContent className="flex gap-2.5 pt-4">
                    <span className="font-mono text-xs text-primary font-bold shrink-0">0{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Dashboard */}
          <section id="dashboard">
            <SectionHead icon={LayoutDashboard} title="Dashboard" where="Sidebar → Dashboard" />
            <p className="text-sm text-muted-foreground mb-4">
              Your home screen. One glance tells you how much you&apos;ve spent against your budget, what&apos;s still
              out at the laundry, and anything overdue.
            </p>
            <div className="grid sm:grid-cols-[1fr_260px] gap-4 items-start">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">This month&apos;s budget</p>
                    <Badge variant="secondary">₹2,450 / ₹4,000</Badge>
                  </div>
                  <div className="flex items-end gap-2 h-16">
                    {[35, 55, 78, 20].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">2 batches overdue for pickup</p>
                  </div>
                </CardContent>
              </Card>
              <Callouts items={[
                <>A <strong className="text-foreground">bar chart</strong> of spend for the current budget period — weekly, monthly, or yearly, your choice in Settings.</>,
                <>An <strong className="text-foreground">overdue list</strong> for batches sitting at the laundry past your reminder threshold.</>,
                <>Tap any batch to jump straight to it.</>,
              ]} />
            </div>
          </section>

          {/* Batches */}
          <section id="batches">
            <SectionHead icon={ListOrdered} title="Batches" where="Sidebar → Batches" />
            <p className="text-sm text-muted-foreground mb-4">
              A <strong className="text-foreground">batch</strong> is one drop-off — everything you hand over together
              in a single trip. Every batch moves through four stages, in order, and the app shows different buttons at each one.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mb-4 text-muted-foreground">
              <BatchStatusBadge status="draft" /><span>→</span>
              <BatchStatusBadge status="in_laundry" /><span>→</span>
              <BatchStatusBadge status="returned" /><span>→</span>
              <BatchStatusBadge status="closed" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase text-muted-foreground">① Draft</span>
                    <BatchStatusBadge status="draft" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Shirt className="h-4 w-4 text-muted-foreground/50" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">Blue Cotton Shirt</p><Badge variant="outline" className="mt-0.5">Shirt</Badge></div>
                    <span className="text-xs text-muted-foreground">—</span>
                  </div>
                  <FakeButton icon={Send}>Send to laundry</FakeButton>
                  <p className="text-xs text-muted-foreground pt-1">Still adding items — nothing has left the house yet.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase text-muted-foreground">② In Laundry</span>
                    <BatchStatusBadge status="in_laundry" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Shirt className="h-4 w-4 text-muted-foreground/50" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">Blue Cotton Shirt</p><Badge variant="outline" className="mt-0.5">Shirt</Badge></div>
                    <span className="text-xs font-medium">₹35.00</span>
                  </div>
                  <FakeButton icon={PackageCheck} variant="outline">Collected</FakeButton>
                  <p className="text-xs text-muted-foreground pt-1">
                    A sheet asks &ldquo;Did you pay upfront?&rdquo; right after sending. When you pick everything up, tap Collected.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase text-muted-foreground">③ Returned</span>
                    <BatchStatusBadge status="returned" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Shirt className="h-4 w-4 text-muted-foreground/50" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Blue Cotton Shirt</p>
                      <div className="flex gap-1 mt-0.5"><Badge variant="outline">Shirt</Badge><Badge variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400 gap-1"><AlertTriangle className="h-2.5 w-2.5" />1 damaged</Badge></div>
                    </div>
                    <span className="text-xs font-medium">₹35.00</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Returned</span>
                  </div>
                  <DashedButton icon={AlertTriangle}>Report damage</DashedButton>
                  <FakeButton icon={ClipboardCheck}>Close inspection</FakeButton>
                  <p className="text-xs text-muted-foreground pt-1">Flag anything wrong right here before closing — see Issues below.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase text-muted-foreground">④ Closed</span>
                    <BatchStatusBadge status="closed" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Shirt className="h-4 w-4 text-muted-foreground/50" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-muted-foreground">Blue Cotton Shirt</p><Badge variant="outline" className="mt-0.5">Shirt</Badge></div>
                    <span className="text-xs font-medium">₹35.00</span>
                  </div>
                  <FakeButton icon={RotateCcw} variant="outline">Send again</FakeButton>
                  <p className="text-xs text-muted-foreground pt-1">Payment recorded, prices locked. &ldquo;Send again&rdquo; starts a fresh batch with the same items.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Paying for a batch</p>
                <div className="flex items-center gap-1.5 flex-wrap text-xs mb-2">
                  <Badge variant="secondary">Send to laundry</Badge><span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">&ldquo;Did you pay upfront?&rdquo;</Badge><span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">Yes, record it now</Badge><span className="text-muted-foreground">or</span>
                  <Badge variant="secondary">I&apos;ll pay on pickup</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  If a vendor&apos;s bill differs from what was expected, leave a quick note when you record payment —
                  a running record of how consistent that vendor&apos;s pricing is.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Closet */}
          <section id="closet">
            <SectionHead icon={Shirt} title="Closet" where="Sidebar → Closet" />
            <p className="text-sm text-muted-foreground mb-4">
              Your wardrobe, digitized. Add each item once — with a photo if you like — and pick it from a grid every
              time you build a batch, instead of typing it out again.
            </p>
            <div className="grid sm:grid-cols-[1fr_260px] gap-4 items-start">
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {[['Blue Shirt', 'Shirt · Blue', '6×'], ['Grey Kurta', 'Custom · Grey', null], ['Denim Jeans', 'Pants', null]].map(([name, meta, badge]) => (
                  <div key={name}>
                    <div className="relative aspect-square rounded-xl bg-muted flex items-center justify-center">
                      <Shirt className="h-5 w-5 text-muted-foreground/40" />
                      {badge && <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full">{badge}</span>}
                    </div>
                    <p className="text-xs font-semibold mt-1.5 truncate">{name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{meta}</p>
                  </div>
                ))}
              </div>
              <Callouts items={[
                <>The small &ldquo;6×&rdquo; badge is how many times you&apos;ve sent that item to the laundry.</>,
                <>Have something that isn&apos;t shirt/pants/etc.? Add it as &ldquo;Other&rdquo; with your own name — &ldquo;Kurta,&rdquo; &ldquo;Dupatta,&rdquo; anything.</>,
              ]} />
            </div>
          </section>

          {/* Calendar */}
          <section id="calendar">
            <SectionHead icon={CalendarDays} title="Calendar" where="Sidebar → Calendar" />
            <p className="text-sm text-muted-foreground mb-4">
              Your batches laid out by date — when each one went out, when it&apos;s due back.
            </p>
            <Card className="max-w-xs">
              <CardContent className="pt-4">
                <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem]">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="font-mono uppercase text-muted-foreground pb-1">{d}</div>)}
                  {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d, i) => (
                    <div key={i} className={cn('rounded py-1', d === 3 || d === 9 ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground')}>{d ?? ''}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground mt-3">Highlighted days have a batch sent or expected back. Tap one to open it.</p>
          </section>

          {/* History */}
          <section id="history">
            <SectionHead icon={History} title="History" where="Sidebar → History" />
            <p className="text-sm text-muted-foreground mb-4">Every batch you&apos;ve closed out, in one scrollable list, for whenever you want to look back.</p>
            <Card>
              <CardContent className="pt-4 divide-y divide-border">
                <div className="flex items-center justify-between pb-3">
                  <div><p className="text-sm font-medium">Batch #128 — Blue Star Laundry</p><p className="text-xs text-muted-foreground">Closed 12 Jul · 8 items</p></div>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">₹280.00</span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <div><p className="text-sm font-medium">Batch #127 — Sunshine Dry Clean</p><p className="text-xs text-muted-foreground">Closed 5 Jul · 4 items</p></div>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">₹150.00</span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Issues */}
          <section id="issues">
            <SectionHead icon={AlertTriangle} title="Issues" where="Sidebar → Issues" />
            <p className="text-sm text-muted-foreground mb-4">
              Anything gone wrong — damaged, missing, or not what you sent — gathered here from every batch instead of
              scattered across each one. If the vendor is on the platform, chat with them directly to sort it out.
            </p>
            <div className="grid sm:grid-cols-[1fr_260px] gap-4 items-start">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Blue Cotton Shirt</p>
                    <Badge variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400">Damage</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Blue Star Laundry · Batch #128</p>
                  <div className="rounded-2xl bg-muted/50 p-3 space-y-2">
                    <div>
                      <p className="font-mono text-[0.6rem] uppercase text-muted-foreground">Blue Star Laundry</p>
                      <div className="mt-1 max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-xs">We&apos;ll credit ₹35 on your next visit — sorry about that.</div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[0.6rem] uppercase text-muted-foreground">You</p>
                      <div className="mt-1 ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-1.5 text-xs text-left">Sounds good, thank you!</div>
                    </div>
                  </div>
                  <FakeButton icon={CheckCircle2} variant="outline">Mark resolved</FakeButton>
                </CardContent>
              </Card>
              <Callouts items={[
                <>Every issue is tied to one specific item, from one specific batch.</>,
                <><strong className="text-foreground">Chat</strong> opens only while the connection and the issue are both still active.</>,
                <>If the <strong className="text-foreground">vendor</strong> raised it, only they can mark it resolved — you can still see it and reply.</>,
              ]} />
            </div>
          </section>

          {/* Summary */}
          <section id="summary">
            <SectionHead icon={BarChart3} title="Summary" where="Sidebar → Summary" />
            <p className="text-sm text-muted-foreground mb-4">Your spending, summarized month by month — total spend, breakdown, and how it tracks against your budget.</p>
            <Card className="max-w-md">
              <CardContent className="pt-4">
                <div className="flex items-end gap-2.5 h-20">
                  {[40, 60, 30, 85, 50, 65].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex gap-2.5 mt-1.5 text-[0.65rem] text-muted-foreground font-mono">
                  {['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map(m => <span key={m} className="flex-1 text-center">{m}</span>)}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Vendors */}
          <section id="vendors">
            <SectionHead icon={Store} title="Vendors" where="Sidebar → Vendors" />
            <p className="text-sm text-muted-foreground mb-4">Two kinds of vendor live here, and they work differently.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Private vendor</p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Store className="h-4 w-4 text-muted-foreground/50" /></div>
                    <p className="text-sm font-medium">Rani Dry Cleaners</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Just a name &amp; phone number you keep — no different from a phone contact. You enter prices yourself.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Platform vendor</p>
                    <Badge variant="secondary" className="gap-1"><Link2 className="h-2.5 w-2.5" />Connected</Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Store className="h-4 w-4 text-muted-foreground/50" /></div>
                    <div><p className="text-sm font-medium">Blue Star Laundry</p><div className="flex gap-1 mt-0.5"><Badge variant="outline">12 prices set</Badge></div></div>
                  </div>
                  <p className="text-xs text-muted-foreground">A real business on the platform — once connected, their rate card fills in prices automatically.</p>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-semibold">Connecting to a platform vendor</p>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <Badge variant="secondary" className="gap-1"><Search className="h-2.5 w-2.5" />Find a vendor</Badge><span className="text-muted-foreground">→</span>
                  <Badge variant="secondary" className="gap-1"><Link2 className="h-2.5 w-2.5" />Request to connect</Badge><span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">They accept or decline</Badge><span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">Connected</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Disconnect any time — it keeps your history and you&apos;re free to reconnect later. &ldquo;My connection
                  requests&rdquo; shows anything still pending.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Settings */}
          <section id="settings">
            <SectionHead icon={Settings2} title="Settings" where="Sidebar → Settings" />
            <p className="text-sm text-muted-foreground mb-4">Set your budget, reminder timing, and how long you have to inspect items before an issue can no longer be raised.</p>
            <Card className="max-w-md">
              <CardContent className="pt-4 divide-y divide-border">
                <div className="flex items-center justify-between pb-3">
                  <p className="text-sm font-medium">Budget</p>
                  <p className="text-xs text-muted-foreground">₹4,000 · Monthly</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm font-medium">Overdue reminder</p>
                  <p className="text-xs text-muted-foreground">2 days after due</p>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <p className="text-sm font-medium">Inspection window</p>
                  <p className="text-xs text-muted-foreground">7 days to flag damage</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Notifications */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1.5"><Bell className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Notifications</p></div>
              <p className="text-sm text-muted-foreground">
                Turn these on in Settings and you&apos;ll get a push notification the moment it matters — a batch reaching
                the laundry, items collected, an overdue pickup, a new chat message, or a connection request answered.
              </p>
            </CardContent>
          </Card>

          <hr className="border-dashed" />

          {/* Vendor side */}
          <div id="vendor-side">
            <p className="font-mono text-xs uppercase tracking-wide text-primary">Vendor side</p>
            <h2 className="text-xl font-bold tracking-tight mt-1 mb-2">Running a laundry business on the platform</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Vendor accounts are set up by invitation — a business is added to the platform first, then runs its own
              portal at a different set of screens. This is what that portal looks like.
            </p>

            <Card className="max-w-lg mb-8">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span className="text-sm font-semibold">Blue Star Laundry</span></div>
                  <span className="text-xs text-muted-foreground">Switch to my personal account →</span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
                  <span className="text-primary font-semibold">Dashboard</span><span>Issues</span><span>Rate card</span><span>Price requests</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-10">
              <section>
                <SectionHead icon={LayoutDashboard} title="Vendor dashboard" where="Vendor portal → Dashboard" />
                <p className="text-sm text-muted-foreground mb-4">Your connected customers, and any pending connection requests waiting on you.</p>
                <Card className="max-w-sm">
                  <CardContent className="pt-4 space-y-2.5">
                    <p className="text-sm font-medium">Anjali Mehta</p>
                    <div className="flex gap-2">
                      <FakeButton icon={Check}>Accept</FakeButton>
                      <FakeButton icon={X} variant="outline">Decline</FakeButton>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <SectionHead icon={Tag} title="Rate card" where="Vendor portal → Rate card" />
                <p className="text-sm text-muted-foreground mb-4">Your own price list. Set it once and it applies to every connected customer automatically — you need at least one saved price to appear in customer search.</p>
                <Card className="max-w-sm">
                  <CardContent className="pt-4 space-y-2.5 divide-y divide-border">
                    <div className="flex items-center justify-between pb-2.5">
                      <span className="text-sm">Shirt</span>
                      <div className="flex items-center gap-2"><Badge variant="outline">₹35.00</Badge><FakeButton variant="outline">Save</FakeButton></div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5">
                      <span className="text-sm">Trousers</span>
                      <div className="flex items-center gap-2"><Badge variant="outline">₹40.00</Badge><FakeButton variant="outline">Save</FakeButton></div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <SectionHead icon={ListChecks} title="Price requests" where="Vendor portal → Price requests" />
                <p className="text-sm text-muted-foreground">When a customer sends a custom item type you&apos;ve never priced, it lands here — set a price and it&apos;s added to your rate card.</p>
              </section>

              <section>
                <SectionHead icon={AlertTriangle} title="Issues & chat" where="Vendor portal → Issues" />
                <p className="text-sm text-muted-foreground">See what a customer has flagged, or raise your own if you spot a problem first. Chat directly with the customer on any open issue.</p>
              </section>

              <section>
                <SectionHead icon={Users} title="Customers" where="Vendor dashboard → Connected customers" />
                <p className="text-sm text-muted-foreground">Your connected customer list, with each one&apos;s batch history — reached from a link on your dashboard.</p>
              </section>
            </div>

            <Card className="max-w-lg mt-8 bg-muted/40">
              <CardContent className="pt-4">
                <p className="text-sm"><strong>Using both sides on one login:</strong> it&apos;s possible to be a customer and run a vendor account under the same login. Look for &ldquo;Switch to my personal account&rdquo; in the vendor portal header — it works both ways.</p>
              </CardContent>
            </Card>
          </div>

          <hr className="border-dashed" />

          {/* Glossary */}
          <section>
            <p className="font-mono text-xs uppercase tracking-wide text-primary">Reference</p>
            <h2 className="text-lg font-bold tracking-tight mt-1 mb-3">A few terms, plainly</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-semibold">Batch</dt><dd className="text-muted-foreground">One trip&apos;s worth of laundry, tracked as a single unit from Draft to Closed.</dd></div>
              <div><dt className="font-semibold">Connection</dt><dd className="text-muted-foreground">The link between you and a platform vendor — requested, accepted or declined, and reconnectable later.</dd></div>
              <div><dt className="font-semibold">Rate card</dt><dd className="text-muted-foreground">A vendor&apos;s own price list, applied automatically to every connected customer.</dd></div>
              <div><dt className="font-semibold">Issue</dt><dd className="text-muted-foreground">A flagged problem on one item. Only the side that raised it can mark it resolved.</dd></div>
              <div><dt className="font-semibold">Chat</dt><dd className="text-muted-foreground">A message thread on one issue, open only while that issue and the connection are both active.</dd></div>
            </dl>
          </section>

          <p className="text-center font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground pt-4">
            Questions this didn&apos;t answer? Use the feedback button in the corner.
          </p>
        </div>
      </div>
    </div>
  )
}
