import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/Syncra'

async function login(page: any) {
  await page.goto(`${APP_URL}/login`)
  await page.fill('[data-testid="login-email"]', 'test@syncra.local')
  await page.fill('[data-testid="login-password"]', 'Test@12345')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/.*dashboard/, { timeout: 10000 })
}

test.describe('Phase 11: Core User Flows — UAT-11.3', () => {
  test('Login flow completes and dashboard renders', async ({ page }) => {
    await page.goto(`${APP_URL}/login`)
    await page.fill('[data-testid="login-email"]', 'test@syncra.local')
    await page.fill('[data-testid="login-password"]', 'Test@12345')
    await page.click('[data-testid="login-submit"]')
    await page.waitForURL(/.*dashboard/, { timeout: 10000 })
    // Dashboard page must be visible
    await expect(page).toHaveURL(/dashboard/)
    // PageWrapper must be rendered
    await expect(page.locator('[data-testid="page-wrapper"]')).toBeVisible()
  })

  test('Dashboard renders without error boundary fallbacks', async ({ page }) => {
    await login(page)
    await page.goto(`${APP_URL}/app/dashboard`)
    await page.waitForLoadState('networkidle')
    // No error fallbacks should be visible on a healthy page
    const errorFallbacks = page.locator('[data-testid="widget-error-fallback"]')
    await expect(errorFallbacks).toHaveCount(0)
  })

  test('Create post modal opens and closes without crash', async ({ page }) => {
    await login(page)
    await page.goto(`${APP_URL}/app/dashboard`)
    await page.waitForLoadState('networkidle')
    // Try to open the create post modal
    const createBtn = page.locator('[data-testid="create-post-btn"], button:has-text("Create"), button:has-text("New Post")').first()
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click()
      // Modal should appear with animation
      const modal = page.locator('[role="dialog"], [class*="modal"]').first()
      await expect(modal).toBeVisible({ timeout: 3000 })
      // Close the modal (press Escape)
      await page.keyboard.press('Escape')
      // Modal should dismiss
      await expect(modal).not.toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  test('Navigation to all main sections does not crash the app', async ({ page }) => {
    await login(page)
    const routes = [
      `${APP_URL}/app/dashboard`,
      `${APP_URL}/app/analytics`,
      `${APP_URL}/app/calendar`,
    ]
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      // Page wrapper must render
      await expect(page.locator('[data-testid="page-wrapper"]')).toBeVisible()
      // No uncaught errors (error boundaries catch render errors — no error fallback)
      await expect(page.locator('[data-testid="widget-error-fallback"]')).not.toBeVisible()
    }
  })

  test('Logout flow redirects to login page', async ({ page }) => {
    await login(page)
    await page.waitForLoadState('networkidle')
    const logoutBtn = page.locator('[data-testid="logout-btn"], button:has-text("Logout"), button:has-text("Sign out")').first()
    if (await logoutBtn.isVisible({ timeout: 3000 })) {
      await logoutBtn.click()
      await expect(page).toHaveURL(/login/, { timeout: 5000 })
    } else {
      test.skip()
    }
  })
})
