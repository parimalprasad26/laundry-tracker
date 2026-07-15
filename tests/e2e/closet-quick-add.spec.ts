import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Deletes the closet items this file creates immediately after each test, rather than
// waiting for global-teardown.ts — other spec files run later in the same suite session
// (e.g. batch-flow.spec.ts's ClosetPicker "first item" assertions) and would otherwise see
// these as the newest closet items until the very end of the whole run.
async function cleanupClosetItems(names: string[]) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (error || !user) return
  await supabase.from('closet_items').delete().eq('user_id', user.id).in('name', names)
}

async function runQuickAddFlow(page: Page, item1: string, item2: string) {
  await page.goto('/closet/new')

  // ── 1. Add first item ──────────────────────────────────────────────
  await page.getByLabel(/name/i).fill(item1)
  await page.getByRole('button', { name: /save & add another/i }).click()

  // No navigation happened — still on /closet/new
  await expect(page).toHaveURL('/closet/new')
  await expect(page.getByText(item1)).toBeVisible({ timeout: 8000 })

  // Name field cleared and refocused for the next entry
  await expect(page.getByLabel(/name/i)).toHaveValue('')
  await expect(page.getByLabel(/name/i)).toBeFocused()

  // ── 2. Add a second item without leaving the page ──────────────────
  await page.getByLabel(/name/i).fill(item2)
  await page.getByRole('button', { name: /save & add another/i }).click()

  await expect(page).toHaveURL('/closet/new')
  await expect(page.getByText(item2)).toBeVisible({ timeout: 8000 })
  // First item is still shown in the session recap list
  await expect(page.getByText(item1)).toBeVisible()

  // ── 3. Done navigates back to the closet, both items present ───────
  await page.getByRole('button', { name: /^done/i }).click()
  await page.waitForURL('/closet')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(item1)).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(item2)).toBeVisible({ timeout: 8000 })
}

test.describe('Closet quick-add (loop flow)', () => {
  test('add two items in a row without leaving /closet/new, then Done', async ({ page }) => {
    const ITEM_1 = `E2E Shirt ${Date.now()}`
    const ITEM_2 = `E2E Pants ${Date.now()}`

    try {
      await runQuickAddFlow(page, ITEM_1, ITEM_2)
    } finally {
      await cleanupClosetItems([ITEM_1, ITEM_2])
    }
  })
})
