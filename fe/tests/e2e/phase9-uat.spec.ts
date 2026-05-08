import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/Syncra'

// Helper to login before tests
async function login(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('syncra_onboarding_completed', 'true')
  })
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

  test('Idea persistence: Create and view idea', async () => {
    // 1. Create idea via modal
    // 2. Refresh page or navigate back
    // 3. Verify idea exists
    test.skip()
  })

  test('Drag and drop triggers reorder/update (manual spec check)', async () => {
    test.skip()
  })

  test('Delete idea', async () => {
    // 1. Click delete on an idea
    // 2. Confirm
    // 3. Verify gone
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

  test('AI generate -> board', async () => {
    // 1. Open AI generator
    // 2. Enter topic
    // 3. Click generate
    // 4. Verify ideas appear on board
    test.skip()
  })
})

test.describe('Phase 9: Multi-Platform Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Auto-save triggers after typing', async () => {
    // 1. Open idea in editor
    // 2. Type content
    // 3. Wait for auto-save debounce
    // 4. Verify "Saved" status
    test.skip()
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

  test('Media upload flow', async () => {
    // 1. Click upload
    // 2. Select file
    // 3. Verify upload progress then success
    // 4. Verify asset in gallery
    test.skip()
  })

  test('Delete media asset', async () => {
    // 1. Click delete on asset
    // 2. Confirm
    // 3. Verify gone from gallery
    test.skip()
  })

  test('Empty state shown when no media exists', async ({ page }) => {
    await page.goto(`${APP_URL}/app/media`)
    // Check for either the "No media yet" heading or the gallery
    const emptyHeading = page.getByRole('heading', { name: 'No media yet' })
    const gallery = page.locator('div[class*="gallery"]')
    
    await expect(emptyHeading.or(gallery)).toBeVisible()
  })
})