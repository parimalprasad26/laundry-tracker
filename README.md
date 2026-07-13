# Laundry Tracker

A personal laundry management app. Track what you send to the laundry, what you pay, when things come back, and whether you're staying within budget.

## Features

- **Closet** — maintain a permanent wardrobe list; items are reused across batches; supports custom item types (e.g. "Kurta", "Dupatta") beyond the standard set
- **Batches** — one batch per drop-off; track status (draft → in laundry → completed)
- **Vendor rate cards** — set per-type prices (shirt ₹30, pants ₹50) and auto-price batch items; custom types from your closet appear automatically in the rate card
- **Payment flow** — pay upfront at drop-off or on pickup; record actual cost vs rate card estimate
- **Price delta notes** — note why you paid more/less than the rate card; surfaced in vendor analytics
- **Budget tracking** — weekly/monthly/yearly spend limits; anchored to sent date so upfront payments count immediately
- **Calendar** — month view with sent/returned dots; tap any date to see batches
- **History** — completed batches with full cost breakdown
- **Summary** — monthly spend analytics: batch count, items sent/returned, avg turnaround, top vendor, damage/missing counts
- **Vendor comparison** — side-by-side stats across vendors (avg cost, turnaround, damage rate)
- **Push notifications** — overdue batch reminders via Web Push; delivered by a daily cron job

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Storage | Supabase Storage |
| Validation | Zod |
| Forms | react-hook-form |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Push notifications (Web Push / VAPID) — optional, skip to disable reminders
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Cron job auth — set this in Vercel env vars and in your cron caller
CRON_SECRET=
```

### Database

Migrations live in `supabase/migrations/`. Apply them in order via the Supabase dashboard or CLI.

## Documentation

- `FLOW.md` — full user flow and all feature combinations in plain language
- `CLAUDE.md` — architecture guide and developer conventions for AI-assisted development
