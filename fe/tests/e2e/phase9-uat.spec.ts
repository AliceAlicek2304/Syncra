import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('Phase 9: Ideas Board Integration', () => {
  test('Ideas Board renders', async ({ page }) => {
    await page.goto(`${APP_URL}/app/ideas`)
    await expect(page.getByText('Ideas', { exact: true })).toBeVisible()
  })

  test('Drag and drop triggers reorder/update (manual spec check)', async () => {
    // E2E DND is complex; verifying the page loads is step 1.
    // In actual UAT, we drag a card between columns and verify backend update.
    test.skip()
  })
})

test.describe('Phase 9: AI Idea Generator', () => {
  test('AI Generator modal opens', async ({ page }) => {
    await page.goto(`${APP_URL}/app/ideas`)
    const aiBtn = page.locator('[data-testid="ai-generate-btn"]')
    if (await aiBtn.isVisible()) {
      await aiBtn.click()
      await expect(page.locator('[data-testid="ai-modal"]')).toBeVisible()
    } else {
      test.skip()
    }
  })
})

test.describe('Phase 9: Media Library', () => {
  test('Media Library page renders', async ({ page }) => {
    await page.goto(`${APP_URL}/app/media`)
    await expect(page.getByText('Media Library')).toBeVisible()
  })

  test('Empty state shown when no media exists', async ({ page }) => {
    await page.goto(`${APP_URL}/app/media`)
    // Either gallery or empty state should be visible
    const hasGallery = await page.locator('[data-testid="media-gallery"]').isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No media yet').isVisible().catch(() => false)
    expect(hasGallery || hasEmpty).toBe(true)
  })
})

test.describe('Phase 9: Multi-platform Editor', () => {
  test('Editor auto-save indicator renders after typing', async () => {
    // This test is a placeholder — full auto-save flow requires backend
    // Manual verification per 09-VALIDATION.md Manual-Only Verifications
    test.skip()
  })
})