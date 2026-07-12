# Laundry Tracker

A personal laundry management app. Track what you send to the laundry, what you pay, when things come back, and whether you're staying within budget.

## Features

- **Closet** — maintain a permanent wardrobe list; items are reused across batches
- **Batches** — one batch per drop-off; track status (draft → in laundry → completed)
- **Vendor rate cards** — set per-type prices (shirt ₹30, pants ₹50) and auto-price batch items
- **Payment flow** — pay upfront at drop-off or on pickup; record actual cost vs rate card estimate
- **Price delta notes** — note why you paid more/less than the rate card; surfaced in vendor analytics
- **Budget tracking** — weekly/monthly/yearly spend limits; anchored to sent date so upfront payments count immediately
- **Calendar** — month view with sent/returned dots; tap any date to see batches
- **History** — completed batches with full cost breakdown

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
```

### Database

Migrations live in `supabase/migrations/`. Apply them in order via the Supabase dashboard or CLI.

## Documentation

- `FLOW.md` — full user flow and all feature combinations in plain language
- `CLAUDE.md` — architecture guide and developer conventions for AI-assisted development
