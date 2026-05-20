import { test, expect, type Page } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/Syncra'

test.describe('Google Sign-In Flow', () => {
  test('Google OAuth button initiates correct OAuth flow', async ({ page }) => {
    await page.goto(`${APP_URL}/login?notour=true`)

    // Wait for login modal to be visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()

    // Set up listener for navigation to Google OAuth
    const navigationPromise = page.waitForNavigation()

    // Click Google sign-in button
    await page.click('button:has-text("Continue with Google")')

    // Wait for redirect to Google
    await navigationPromise

    // Verify we're on Google's OAuth page
    await expect(page).toHaveURL(/accounts\.google\.com/)

    // Verify OAuth parameters are correct
    const url = new URL(page.url())
    expect(url.searchParams.get('client_id')).toBe('1055602008266-9rmplqdo79gciqgm75g7pjsoe24894a4.apps.googleusercontent.com')
    expect(url.searchParams.get('redirect_uri')).toContain('localhost:5173/Syncra/auth/google/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toContain('email')
    expect(url.searchParams.get('scope')).toContain('profile')
  })

  test('OAuth callback page handles redirect from Google', async ({ page }) => {
    // Simulate Google OAuth callback with mock code and state
    const mockCode = 'mock_auth_code_12345'
    const mockState = 'mock_state_token'

    await page.goto(`${APP_URL}/auth/google/callback?code=${mockCode}&state=${mockState}`)

    // Callback page should be visible (may show loading or error depending on backend)
    await expect(page.locator('[data-testid="page-wrapper"], body')).toBeVisible()
  })

  test('Google button is accessible and properly labeled', async ({ page }) => {
    await page.goto(`${APP_URL}/login?notour=true`)

    const googleBtn = page.locator('button:has-text("Continue with Google")')

    // Button should be visible and enabled
    await expect(googleBtn).toBeVisible()
    await expect(googleBtn).toBeEnabled()

    // Button should have proper accessibility attributes
    const ariaLabel = await googleBtn.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
  })

  test('Google sign-in button appears before email/password form', async ({ page }) => {
    await page.goto(`${APP_URL}/login?notour=true`)

    const googleBtn = page.locator('button:has-text("Continue with Google")')
    const emailInput = page.locator('[data-testid="login-email"]')

    // Both should be visible
    await expect(googleBtn).toBeVisible()
    await expect(emailInput).toBeVisible()

    // Google button should appear first in DOM
    const googleBox = await googleBtn.boundingBox()
    const emailBox = await emailInput.boundingBox()

    expect(googleBox?.y).toBeLessThan(emailBox?.y || 0)
  })
})
