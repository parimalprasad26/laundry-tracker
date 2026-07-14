import { test, expect } from '@playwright/test'

// These tests must run without the global authenticated session
test.use({ storageState: { cookies: [], origins: [] } })

test('redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('login page shows Google sign-in button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
})
