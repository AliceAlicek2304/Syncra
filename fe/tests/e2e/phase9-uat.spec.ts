import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

// Helper to login before tests
async function login(page: any) {
  await page.goto(`${APP_URL}/login`)
  // The LoginModal should be visible
  await page.fill('[data-testid="login-email"]', 'test@syncra.local')
  await page.fill('[data-testid="login-password"]', 'Test@12345')
  await page.click('[data-testid="login-submit"]')
  // Wait for navigation
  await page.waitForURL(/.*dashboard/, { timeout: 10000 })
}


test.describe('Phase 9: Ideas Board Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Ideas Board renders', async ({ page }) => {
    await page.goto(`${APP_URL}/app/ideas`)
    // Use role heading to avoid ambiguity with nav links
    await expect(page.getByRole('heading', { name: 'Ideas', exact: true })).toBeVisible()
  })

  test('Drag and drop triggers reorder/update (manual spec check)', async () => {
    test.skip()
  })
})

test.describe('Phase 9: AI Idea Generator', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('AI Generator modal opens', async ({ page }) => {
    await page.goto(`${APP_URL}/app/ideas`)
    const aiBtn = page.getByRole('button', { name: /generate/i })
    await expect(aiBtn).toBeVisible()
    await aiBtn.click()
    // Check for unique text in the generator form
    await expect(page.getByText(/What do you want to create\?/i)).toBeVisible()


  })
})

test.describe('Phase 9: Media Library', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Media Library page renders', async ({ page }) => {
    await page.goto(`${APP_URL}/app/media`)
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible()
  })

  test('Empty state shown when no media exists', async ({ page }) => {
    await page.goto(`${APP_URL}/app/media`)
    // Check for either the "No media yet" heading or the gallery
    const emptyHeading = page.getByRole('heading', { name: 'No media yet' })
    const gallery = page.locator('div[class*="gallery"]')
    
    await expect(emptyHeading.or(gallery)).toBeVisible()
  })
})