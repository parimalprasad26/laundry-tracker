# Laundry Tracker — App Flow & User Guide

A personal laundry management app. You track what clothes you send to the laundry, how much you pay, when they come back, and how your spending compares to your budget.

---

## The Big Picture

The app revolves around **batches** — each time you drop off clothes at the laundry, that's one batch. Inside each batch are **items** from your **closet**. When the clothes come back, you mark them returned and record what you paid.

```
Closet (your clothes)
    ↓
Batch (one drop-off)
    ↓ contains
Batch Items (which clothes from your closet)
    ↓ priced by
Vendor (the laundry shop + their rate card)
    ↓ tracked against
Budget (your weekly/monthly/yearly spend limit)
```

---

## Pages Overview

| Page | What it does |
|------|-------------|
| **Dashboard** | Spend vs budget widget + stats + recent batches + spending trends chart |
| **Batches** | Full list of all batches with filters |
| **Closet** | Your permanent wardrobe — add clothes once, reuse across batches; supports custom item types |
| **Calendar** | Month view showing when batches were sent and returned |
| **History** | Only completed batches |
| **Summary** | Monthly analytics — batch count, items sent/returned, avg turnaround, top vendor, damage/missing counts |
| **Vendors** | Laundry shops + their price lists; compare vendors side-by-side |
| **Settings** | Budget amount, period, and overdue reminder threshold |

---

## Core Concepts

### Batch Status

A batch is always in one of three states — it moves forward, never backward:

| Status | Meaning |
|--------|---------|
| **Draft** | Created, not yet sent to laundry. You can add/remove items. |
| **In Laundry** | Sent. Items are at the laundry shop. |
| **Completed** | All items returned. Batch is closed. |

Status is computed automatically — you never set it manually. It's derived from:
- Has `sent_at` been set? (Draft → In Laundry)
- Are all items returned? (In Laundry → Completed)

### Closet Items

Your closet is a permanent list of your clothes. You add a shirt once, then include it in any number of batches. Each closet item has a **type** (shirt, pants, jacket, etc.) which is used to auto-price it from the vendor's rate card.

If your item doesn't fit a standard type, choose **Other** and enter a custom name (e.g. "Kurta", "Dupatta", "Saree"). Custom names must be 2–30 characters and can't duplicate a standard type name. Custom types you've added appear automatically as rows in the vendor rate card so you can set prices for them too.

### Vendor Rate Card

Each vendor (laundry shop) can have per-type prices — e.g. Shirt ₹30, Pants ₹50, Jacket ₹80. When you add closet items to a batch, they get auto-priced from the vendor's rate card. You can always override individual prices manually.

---

## Full User Flows

### Flow 1 — Create a batch, pay on pickup

This is the standard flow for most people.

1. **Create batch** — go to Batches → New batch. Give it a name, optionally pick a vendor.
2. **Add items** — tap "Add from closet", select the clothes you're sending. Items get auto-priced from the vendor's rate card if available.
3. **Adjust prices** (optional) — tap any item's price to edit it manually.
4. **Send to laundry** — tap the ⋮ menu → "Send to laundry". The batch moves to **In Laundry**.
5. **Prompt: "Did you pay upfront?"** — tap **"I'll pay on pickup"**. Sheet closes, batch is sent.
6. **Items return** — as each item comes back, tap it to mark it returned. The progress bar fills up.
7. **All returned** — tap ⋮ → "All returned" (or mark the last item). The **Record Payment** sheet opens automatically.
8. **Record payment** — enter the amount you paid. If it differs from the rate card total, an amber banner shows the gap. Add a note if you want (e.g. "charged extra for ironing"). Tap Submit.
9. Batch moves to **Completed**. Spend is added to your budget.

---

### Flow 2 — Pay upfront at drop-off

Some laundry shops collect payment when you drop off the clothes.

1–4. Same as Flow 1 (create batch, add items, send to laundry).
5. **Prompt: "Did you pay upfront?"** — tap **"Yes, record payment"**.
6. **Record Payment sheet opens immediately** — enter what you paid. Submit.
7. Batch is now **In Laundry** with payment already recorded.
8. When items return, mark them one by one or use "All returned".
9. Since payment was already recorded, no payment sheet appears — just a success toast.
10. Batch moves to **Completed**.

**Note:** The budget widget counts this spend immediately (as soon as the batch is sent), not when items return. So your budget tracking is always accurate even if clothes are still at the laundry.

---

### Flow 3 — Partial returns (items come back in batches)

When some items come back today and the rest tomorrow:

1. Mark the items that returned today using the toggle on each card.
2. Progress bar updates (e.g. "2 of 5 returned").
3. Come back later and mark the remaining items as they arrive.
4. When the last item is marked, or you tap "All returned", the payment sheet opens (if unpaid).

If you accidentally over-mark (mark something returned that isn't), tap it again to un-return it. The batch goes back to **In Laundry** automatically.

---

### Flow 4 — Items with multiple quantities

If you're sending 3 pairs of socks as one "closet item":

- The item shows a **+/−** stepper instead of a simple toggle.
- Tap **+** each time a pair comes back (0/3 → 1/3 → 2/3 → 3/3).
- Tap **−** to undo a return.
- When all quantities are returned, the card turns green.

---

### Flow 5 — No vendor (manual pricing)

You don't have to use vendors. Without a vendor:

- Items are added with no price (shows "—").
- Tap "—" on any item card to set a price manually.
- The rate card estimate in the cost summary updates as you set prices.
- Items with no price set are excluded from the estimate — the summary notes how many are unpriced.

---

### Flow 6 — Vendor with rate card

When a batch has a vendor with prices configured:

1. Items added from closet get auto-priced by type (shirt → ₹30, pants → ₹50).
2. If new items are added later and the vendor has matching prices, they're also auto-priced.
3. If some items still don't have prices (e.g. vendor has no price for "other"), a blue banner appears: **"Vendor prices available — apply to unpriced items"**. Tap Apply.
4. The rate card estimate shows the sum of all priced items.
5. Unpriced items are flagged in the summary: "2 items unpriced — tap — on a card to set manually".

---

## Payment Notes & Vendor Analytics

Whenever the amount you actually paid differs from the rate card estimate, you can leave a note (e.g. "charged extra for ironing", "got discount"). These notes are saved on the batch.

On the **Vendor page**, a "Payment notes" section appears showing:
- All batches where the actual payment differed from the rate card
- The delta for each batch (+₹ overpaid or −₹ saved)
- An average delta across all noted batches
- An amber banner if you're consistently paying more than the rate card suggests (prompting you to update the rate card)

---

## Budget Tracking

### Setup

Go to **Settings** → set a budget period (Weekly / Monthly / Yearly) and an amount (e.g. ₹2,000/month).

### How spend is counted

- Only **paid batches** count (those with an `actual_cost` recorded).
- The spend is anchored to **when the batch was sent** (`sent_at`), not when it was returned.
  - This means if you paid upfront, the spend is counted immediately even if clothes haven't come back yet.
- **Weekly period starts on Monday.**

### Dashboard widget

- **No budget set:** shows "₹X spent this month" with a "Set a budget →" link.
- **Budget set, under limit:** shows progress bar, "₹X of ₹Y", and remaining amount.
- **Budget set, over limit:** progress bar turns red, shows "₹X over budget".
- Widget is hidden entirely if you've spent ₹0 and have no budget set.

---

## Calendar

The calendar shows which days had laundry activity:

- **Blue dot** — a batch was sent on this day
- **Green dot** — a batch was returned on this day
- **Both dots** — batch sent and returned on the same day (same-day service)

Tap any date to see a sheet listing all batches for that day, with their status and amount paid. Tap a batch to go to its detail page.

Use the **← →** arrows to navigate between months.

---

## Closet Management

### Adding items

Go to **Closet** → Add item. Fill in: name, type (shirt/pants/etc.), color (optional). The type is what gets matched against vendor prices.

### Deleting items

You can delete a closet item only if it's **not currently in an active batch** (draft or in laundry). If it is, you'll see an error. You must first complete or remove the item from active batches.

Completed batches don't block deletion — the historical record is preserved in the batch items even after the closet item is gone.

---

## Batch Detail Page

### What you can do by status

| Action | Draft | In Laundry | Completed |
|--------|-------|------------|-----------|
| Add items from closet | ✓ | ✓ | ✗ |
| Edit item price | ✓ | ✓ | ✗ |
| Remove item from batch | ✓ | ✓ | ✗ |
| Apply vendor prices | ✓ | ✓ | ✗ |
| Mark items returned | ✗ | ✓ | ✗ |
| Send to laundry | ✓ | ✗ | ✗ |
| All returned | ✗ | ✓ | ✗ |
| Record payment | ✗ | ✓ | ✓ (via ⋮) |
| Delete batch | ✓ | ✓ | ✓ |

### Cost summary

Shows at the bottom of the batch detail when any pricing exists:

- **Rate card estimate** — sum of all item `unit_price × quantity_sent` (live, recalculates as prices change)
- **Amount paid** — the `actual_cost` recorded at payment time (fixed once recorded)
- **vs rate card** — the delta (green if you saved, red if you overpaid)
- **Price delta note** — the note you wrote when recording payment (if any)

---

## Summary Page

The **Summary** page shows one month at a time (use ← → to navigate):

- **Batch count** — how many batches were completed that month
- **Items sent / returned** — totals across all batches
- **Avg turnaround** — average days between sent and returned
- **Top vendor** — vendor used most that month
- **Damaged / missing** — total item issues flagged across batches

---

## Vendor Comparison

On the **Vendors** page, if you have 2+ vendors a **Compare** button appears. The comparison page shows side-by-side stats:

- Avg cost per batch
- Total spend
- Avg turnaround days
- Total items sent
- Damage rate and missing rate

Use this to decide which vendor gives better value.

---

## Push Notification Reminders

If you opt in to push notifications (prompted during onboarding or via Settings), you'll receive a daily reminder whenever a batch has been **in laundry longer than your reminder threshold** (default 2 days, configurable in Settings).

Notifications are delivered by a server-side cron job. They fire even when the app isn't open.

---

## Edge Cases

| Situation | What happens |
|-----------|-------------|
| Try to send a batch with 0 items | Blocked with a toast error — "Add items before sending" |
| Mark all returned, then un-return one | Batch goes back to In Laundry; `returned_at` is cleared |
| Edit a price on a completed batch | Blocked — price tap and ⋮ menu are disabled |
| Pay ₹0 in the payment sheet | Blocked with a toast error |
| Try to delete a closet item in an active batch | Blocked with an error message |
| Vendor has no price for an item type | Item added with no price; banner appears to apply remaining vendor prices |
| Budget period is weekly, today is Sunday | Week is counted Mon–Sun; Sunday is the last day of the current week |
| Custom type name matches a standard type (e.g. "shirt") | Blocked — must use the standard type instead |
| Closet has custom types but vendor has no price for them | Custom type rows appear in rate card with blank price; items added with no price |
