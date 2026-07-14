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
