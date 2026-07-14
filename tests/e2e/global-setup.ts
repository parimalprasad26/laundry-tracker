import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '.auth/session.json')

export default async function globalSetup() {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ── 1. Sign in via Supabase JS to get the user ID ────────────────────
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !user) throw new Error(`Supabase sign-in failed: ${error?.message}`)

  const userId = user.id

  // ── 2. Seed baseline data if not already present ─────────────────────
  // Closet item
  const { data: existingItems } = await supabase
    .from('closet_items')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1)

  if (!existingItems?.length) {
    await supabase.from('closet_items').insert({
      user_id: userId,
      name: 'Test Shirt',
      type: 'shirt',
      created_by: userId,
      updated_by: userId,
    })
  }

  // Vendor
  const { data: existingVendors } = await supabase
    .from('laundry_vendors')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1)

  if (!existingVendors?.length) {
    await supabase.from('laundry_vendors').insert({
      user_id: userId,
      name: 'Test Laundry',
      created_by: userId,
      updated_by: userId,
    })
  }

  // ── 3. Open browser, authenticate via test API route ─────────────────
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  await page.goto(BASE_URL)
  const res = await page.request.post('/api/e2e-auth', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) throw new Error(`e2e-auth failed (${res.status()}): ${await res.text()}`)

  // ── 4. Navigate to dashboard and dismiss onboarding modal if present ──
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForURL('**/dashboard', { timeout: 15000 })

  for (let i = 0; i < 5; i++) {
    const overlay = page.locator('[class*="fixed"][class*="inset-0"]').first()
    const visible = await overlay.isVisible({ timeout: 1500 }).catch(() => false)
    if (!visible) break
    const btn = overlay.locator('button').last()
    if (!(await btn.isVisible({ timeout: 800 }).catch(() => false))) break
    await btn.click()
    await page.waitForTimeout(600)
  }
  await page.locator('[class*="fixed"][class*="inset-0"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  // ── 5. Save session ───────────────────────────────────────────────────
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  await context.storageState({ path: AUTH_FILE })
  await browser.close()
  console.log('✓ e2e session saved')
}
