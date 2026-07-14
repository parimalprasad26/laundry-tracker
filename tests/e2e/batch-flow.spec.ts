import { test, expect } from '@playwright/test'

test.describe('Navigation — all tabs load', () => {
  test('no tab crashes or redirects to login', async ({ page }) => {
    const routes = ['/dashboard', '/batches', '/closet', '/calendar', '/history', '/summary', '/vendors', '/settings']
    for (const route of routes) {
      await page.goto(route)
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.getByText(/application error/i)).not.toBeVisible()
    }
  })
})

test.describe('Batch lifecycle (full flow)', () => {
  test('create → add items → send → collect → close → history', async ({ page }) => {
    const BATCH_NAME = `E2E Test ${Date.now()}`

    // ── 1. Create batch ────────────────────────────────────────────────
    await page.goto('/batches/new')
    await page.getByLabel('Batch name *').fill(BATCH_NAME)
    await page.getByRole('button', { name: 'Create batch' }).click()
    await page.waitForURL(/\/batches\/[0-9a-f-]{36}$/, { timeout: 10000 })
    const batchUrl = page.url()
    await expect(page.getByRole('heading', { name: BATCH_NAME })).toBeVisible()

    // ── 2. Add an item from closet ─────────────────────────────────────
    const addBtn = page.getByRole('button', { name: /add from closet/i })
    await expect(addBtn).toBeVisible({ timeout: 5000 })
    await addBtn.click()

    // ClosetPicker sheet: select first non-disabled item in the grid, then confirm
    const sheet = page.locator('[role="dialog"]')
    await sheet.waitFor({ timeout: 5000 })

    // Scope to the scrollable items area to avoid matching the X close button
    const itemsArea = sheet.locator('div.overflow-y-auto')
    await itemsArea.waitFor({ timeout: 5000 })

    const firstItem = itemsArea.locator('button[type="button"]:not([disabled])').first()
    await expect(firstItem).toBeVisible({ timeout: 5000 })
    await firstItem.click()
    await page.waitForTimeout(300)
    const addItemsBtn = sheet.getByRole('button', { name: /add \d+ item/i })
    await expect(addItemsBtn).toBeVisible({ timeout: 3000 })
    await addItemsBtn.click()
    await sheet.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})

    // Confirm at least 1 item was added
    await expect(page.getByText(/Items \([1-9]\d*\)/)).toBeVisible({ timeout: 8000 })

    // ── 3. Send to laundry ─────────────────────────────────────────────
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Send to laundry' }).click()

    // "Did you pay upfront?" sheet always appears after a successful send
    await expect(page.getByRole('button', { name: /pay on pickup/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /pay on pickup/i }).click()

    // After dismissal + router.refresh(), "Collected" replaces "Send to laundry"
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Collected' })).toBeVisible({ timeout: 10000 })

    // ── 4. Collect (mark all returned) ────────────────────────────────
    await page.getByRole('button', { name: 'Collected' }).click()

    // CollectionSheet uses +/- buttons (no spinbutton). Count defaults to total_items.
    // Click "Confirm collection" (shown when shortfall = 0)
    const confirmCollect = page.getByRole('button', { name: /confirm collection/i })
    await expect(confirmCollect).toBeVisible({ timeout: 5000 })
    await confirmCollect.click()

    // After collection, status badge shows "Returned" on the detail page
    await expect(page.getByText('Returned').first()).toBeVisible({ timeout: 10000 })

    // ── 5. Close inspection ────────────────────────────────────────────
    // Payment sheet auto-opens after collection (since we chose "pay on pickup")
    const amountInput = page.getByRole('spinbutton')
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill('100')
      await page.getByRole('button', { name: /save payment/i }).click()
      await page.waitForTimeout(500)
    }

    await page.goto(batchUrl) // re-navigate for clean state
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Close inspection' }).click()
    await expect(page.getByText('Closed').first()).toBeVisible({ timeout: 8000 })

    // ── 6. Appears in history ──────────────────────────────────────────
    await page.goto('/history')
    await expect(page.getByText(BATCH_NAME)).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Batch lifecycle (shortfall — item not returned)', () => {
  test('collect with missing item → identify it → batch marked returned', async ({ page }) => {
    const BATCH_NAME = `E2E Test Shortfall ${Date.now()}`

    // ── 1. Create batch ────────────────────────────────────────────────
    await page.goto('/batches/new')
    await page.getByLabel('Batch name *').fill(BATCH_NAME)
    await page.getByRole('button', { name: 'Create batch' }).click()
    await page.waitForURL(/\/batches\/[0-9a-f-]{36}$/, { timeout: 10000 })

    // ── 2. Add an item ─────────────────────────────────────────────────
    await page.getByRole('button', { name: /add from closet/i }).click()
    const sheet = page.locator('[role="dialog"]')
    await sheet.waitFor({ timeout: 5000 })
    const firstItem = sheet.locator('div.overflow-y-auto button[type="button"]:not([disabled])').first()
    await expect(firstItem).toBeVisible({ timeout: 5000 })
    await firstItem.click()
    await page.waitForTimeout(300)
    await sheet.getByRole('button', { name: /add \d+ item/i }).click()
    await sheet.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
    await expect(page.getByText(/Items \([1-9]\d*\)/)).toBeVisible({ timeout: 8000 })

    // ── 3. Send to laundry ─────────────────────────────────────────────
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Send to laundry' }).click()
    await expect(page.getByRole('button', { name: /pay on pickup/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /pay on pickup/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Collected' })).toBeVisible({ timeout: 10000 })

    // ── 4. Collect with shortfall (0 items returned out of 1) ──────────
    await page.getByRole('button', { name: 'Collected' }).click()

    // Decrement count from 1 → 0 to create a shortfall of 1
    const decrementBtn = page.getByRole('button', { name: '−' })
    await expect(decrementBtn).toBeVisible({ timeout: 5000 })
    await decrementBtn.click()

    // "Next — identify 1 missing item" appears when shortfall > 0
    const nextBtn = page.getByRole('button', { name: /next.*missing/i })
    await expect(nextBtn).toBeVisible({ timeout: 3000 })
    await nextBtn.click()

    // ── 5. Step 2: identify the missing item ──────────────────────────
    // "0 of 1 identified" badge is shown; click the item to mark it missing
    await expect(page.getByText(/0 of 1 identified/i)).toBeVisible({ timeout: 3000 })
    const missingItemBtn = page.getByRole('button', { name: /test shirt/i })
    await expect(missingItemBtn).toBeVisible({ timeout: 3000 })
    await missingItemBtn.click()

    // Badge updates to "1 of 1 identified" and Confirm becomes enabled
    await expect(page.getByText(/1 of 1 identified/i)).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /confirm collection/i }).click()

    // ── 6. Batch is marked Returned despite shortfall ──────────────────
    await expect(page.getByText('Returned').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Damage & dispute flow', () => {
  test('report damage after collection → close → open dispute → resolve', async ({ page }) => {
    const BATCH_NAME = `E2E Test Damage ${Date.now()}`

    // ── 1. Create batch ────────────────────────────────────────────────
    await page.goto('/batches/new')
    await page.getByLabel('Batch name *').fill(BATCH_NAME)
    await page.getByRole('button', { name: 'Create batch' }).click()
    await page.waitForURL(/\/batches\/[0-9a-f-]{36}$/, { timeout: 10000 })
    const batchUrl = page.url()

    // ── 2. Add an item ─────────────────────────────────────────────────
    await page.getByRole('button', { name: /add from closet/i }).click()
    const sheet = page.locator('[role="dialog"]')
    await sheet.waitFor({ timeout: 5000 })
    const itemsArea = sheet.locator('div.overflow-y-auto')
    await itemsArea.waitFor({ timeout: 5000 })
    const firstItem = itemsArea.locator('button[type="button"]:not([disabled])').first()
    await expect(firstItem).toBeVisible({ timeout: 5000 })
    await firstItem.click()
    await page.waitForTimeout(300)
    await sheet.getByRole('button', { name: /add \d+ item/i }).click()
    await sheet.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
    await expect(page.getByText(/Items \([1-9]\d*\)/)).toBeVisible({ timeout: 8000 })

    // ── 3. Send to laundry ─────────────────────────────────────────────
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Send to laundry' }).click()
    await expect(page.getByRole('button', { name: /pay on pickup/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /pay on pickup/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Collected' })).toBeVisible({ timeout: 10000 })

    // ── 4. Collect ─────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Collected' }).click()
    await expect(page.getByRole('button', { name: /confirm collection/i })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /confirm collection/i }).click()
    await expect(page.getByText('Returned').first()).toBeVisible({ timeout: 10000 })

    // Dismiss payment sheet if it auto-opens (pay on pickup)
    const amountInput = page.getByRole('spinbutton')
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill('100')
      await page.getByRole('button', { name: /save payment/i }).click()
      await page.waitForTimeout(500)
    }

    // ── 5. Report damage on the first item ────────────────────────────
    await page.goto(batchUrl)
    await page.waitForLoadState('networkidle')
    const reportDamageBtn = page.getByRole('button', { name: /report damage/i }).first()
    await expect(reportDamageBtn).toBeVisible({ timeout: 8000 })
    await reportDamageBtn.click()

    // ReportIssuesSheet: h-10 w-10 buttons are the counter −/+ buttons
    const issuesSheet = page.locator('[role="dialog"]')
    await issuesSheet.waitFor({ timeout: 5000 })
    const plusBtn = issuesSheet.locator('button.h-10.w-10').nth(1)
    await expect(plusBtn).toBeVisible({ timeout: 3000 })
    await plusBtn.click()
    await issuesSheet.getByRole('button', { name: 'Save' }).click()
    await issuesSheet.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    // Damage badge appears on item card
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/1 damaged/i).first()).toBeVisible({ timeout: 8000 })

    // ── 6. Close inspection ────────────────────────────────────────────
    await page.getByRole('button', { name: 'Close inspection' }).click()
    const inspectionSheet = page.locator('[role="dialog"]')
    await inspectionSheet.waitFor({ timeout: 5000 })
    await inspectionSheet.getByRole('button', { name: /close.*finish.*all good/i }).click()
    await expect(page.getByText('Closed').first()).toBeVisible({ timeout: 8000 })

    // ── 7. Open a dispute on the item ─────────────────────────────────
    await page.goto(batchUrl)
    await page.waitForLoadState('networkidle')
    const openDisputeBtn = page.getByRole('button', { name: /found damage.*open a dispute/i }).first()
    await expect(openDisputeBtn).toBeVisible({ timeout: 8000 })
    await openDisputeBtn.click()

    // DisputeForm: increment "Damaged" counter
    const disputeSheet = page.locator('[role="dialog"]')
    await disputeSheet.waitFor({ timeout: 5000 })
    const disputePlusBtn = disputeSheet.locator('button.h-9.w-9').nth(1)
    await expect(disputePlusBtn).toBeVisible({ timeout: 3000 })
    await disputePlusBtn.click()
    await disputeSheet.getByRole('button', { name: 'Open dispute' }).click()
    await disputeSheet.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    // Issues panel shows "Dispute open" badge
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Dispute open').first()).toBeVisible({ timeout: 8000 })

    // ── 8. Resolve the dispute ─────────────────────────────────────────
    await page.getByRole('button', { name: /mark resolved/i }).first().click()
    await expect(page.getByText(/resolved/i).first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Settings', () => {
  test('inspection policy section is present and interactive', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Inspection policy')).toBeVisible()
    await expect(page.getByText('Inspection window')).toBeVisible()
    await expect(page.getByText('Auto-close after')).toBeVisible()
    await expect(page.getByText('Dispute window')).toBeVisible()

    // Tap a pill — should save without error
    const pill14 = page.getByRole('button', { name: /^14 days$/ }).first()
    if (await pill14.isVisible()) {
      await pill14.click()
      await page.waitForTimeout(500)
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }
  })
})

test.describe('Vendors', () => {
  test('vendors page loads; detail page shows damage record', async ({ page }) => {
    await page.goto('/vendors')
    await expect(page.getByRole('heading', { name: /vendors/i })).toBeVisible()

    // Only visit detail pages (UUID paths), not /vendors/new
    const detailLink = page.locator('a[href^="/vendors/"]:not([href="/vendors/new"])').first()
    if (await detailLink.count() > 0) {
      await detailLink.click()
      await page.waitForURL(/\/vendors\/[a-f0-9-]{36}/, { timeout: 8000 })
      await expect(page.getByText('Damage record')).toBeVisible()
    }
  })
})
