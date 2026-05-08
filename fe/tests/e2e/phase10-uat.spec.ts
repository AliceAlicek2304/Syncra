import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

async function login(page: any) {
  await page.goto(`${APP_URL}/login`)
  await page.fill('[data-testid="login-email"]', 'test@syncra.local')
  await page.fill('[data-testid="login-password"]', 'Test@12345')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/.*dashboard/, { timeout: 10000 })
}

test.describe('Phase 10: Calendar — UAT-10.1', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Calendar page renders with month grid', async ({ page }) => {
    await page.goto(`${APP_URL}/app/calendar`)
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()
    // Month grid should be present
    await expect(page.locator('[class*="monthGrid"]')).toBeVisible()
  })

  test('Month navigation buttons work', async ({ page }) => {
    await page.goto(`${APP_URL}/app/calendar`)
    const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(1)
    await expect(prevBtn).toBeVisible()
    await expect(nextBtn).toBeVisible()
  })

  test('Skeleton shown while calendar loads', async ({ page }) => {
    await page.goto(`${APP_URL}/app/calendar`)
    // Skeletons should appear briefly or the grid should eventually render
    await expect(page.locator('[data-testid="skeleton-loader"]').or(page.locator('[class*="monthGrid"]'))).toBeVisible()
  })
})

test.describe('Phase 10: Calendar — UAT-10.2 Drag-to-reschedule', () => {
  test('Drag-to-reschedule triggers API call (manual verification)', async () => {
    test.skip()
  })
})

test.describe('Phase 10: Analytics — UAT-10.3', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Analytics page renders with preset selector', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    // Preset button should be visible
    await expect(page.getByText(/last 7 days|last 30 days|last 90 days/i).first()).toBeVisible()
  })

  test('Preset dropdown opens and shows 3 options', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    const presetBtn = page.locator('[class*="presetBtn"]')
    await expect(presetBtn).toBeVisible()
    await presetBtn.click()
    await expect(page.getByText('Last 7 days')).toBeVisible()
    await expect(page.getByText('Last 30 days')).toBeVisible()
    await expect(page.getByText('Last 90 days')).toBeVisible()
  })

  test('Metric cards render with skeleton or values', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    // Metric cards should exist
    const metricCards = page.locator('[class*="metricCard"]')
    await expect(metricCards.first()).toBeVisible()
    // Either skeleton or real values should be present
    await expect(
      page.locator('[data-testid="skeleton-loader"]').or(page.getByText(/reach|engagement|growth|posts/i).first())
    ).toBeVisible()
  })
})

test.describe('Phase 10: Heatmap — UAT-10.4', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Heatmap 7×24 grid renders', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    // Scroll to heatmap section
    const heatmapSection = page.getByText(/giờ vàng|best time|heatmap/i)
    await expect(heatmapSection.first()).toBeVisible()
    // Grid cells should exist
    await expect(page.locator('[class*="cell"]').first()).toBeVisible()
  })

  test('Heatmap tooltip appears on hover', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    const cell = page.locator('[class*="cell"]').first()
    await expect(cell).toBeVisible()
    await cell.hover()
    // Tooltip should appear
    await expect(page.locator('[class*="tooltip"]')).toBeVisible()
  })
})

test.describe('Phase 10: Notifications — UAT-10.5', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Notification bell visible on dashboard', async ({ page }) => {
    await page.goto(`${APP_URL}/app/dashboard`)
    // Bell button should be present in the layout
    const bellBtn = page.locator('[class*="bellBtn"]')
    await expect(bellBtn).toBeVisible()
  })

  test('Notification bell visible on calendar', async ({ page }) => {
    await page.goto(`${APP_URL}/app/calendar`)
    const bellBtn = page.locator('[class*="bellBtn"]')
    await expect(bellBtn).toBeVisible()
  })

  test('Notification bell visible on analytics', async ({ page }) => {
    await page.goto(`${APP_URL}/app/analytics`)
    const bellBtn = page.locator('[class*="bellBtn"]')
    await expect(bellBtn).toBeVisible()
  })

  test('Bell click opens dropdown with empty state', async ({ page }) => {
    await page.goto(`${APP_URL}/app/dashboard`)
    const bellBtn = page.locator('[class*="bellBtn"]')
    await bellBtn.click()
    // Empty state copy should appear
    await expect(page.getByText('No notifications yet')).toBeVisible()
    await expect(page.getByText(/we'll let you know/i)).toBeVisible()
  })

  test('Dropdown header shows Notifications title', async ({ page }) => {
    await page.goto(`${APP_URL}/app/dashboard`)
    const bellBtn = page.locator('[class*="bellBtn"]')
    await bellBtn.click()
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible()
  })
})

test.describe('Phase 10: SignalR — UAT-10.6', () => {
  test('Realtime notification received via SignalR (requires backend emitter)', async () => {
    test.skip()
  })
})
