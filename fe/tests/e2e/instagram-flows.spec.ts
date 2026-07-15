import { test, expect } from '@playwright/test';

test.describe('Instagram Integration Flow E2E Tests', () => {
  const BASE_URL = 'http://127.0.0.1:5173';

  test('should open composer, upload media, fill Instagram options, and publish with correct payload', async ({ page }) => {
    const requests: string[] = [];
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log('[PAGE ERROR]', err.message);
      console.log(err.stack);
    });
    page.on('request', req => {
      if (req.url().includes('/api/v1')) {
        requests.push(`${req.method()} ${req.url()}`);
      }
    });

    // Mock API endpoints
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ userId: 'user123', email: 'localtest@gmail.com', displayName: 'Local Test User', firstName: 'Local', lastName: 'Test' })
      });
    });
    await page.route('**/api/v1/workspaces', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 'ws123', name: 'My Workspace', color: '#6C3FF5' }])
      });
    });
    await page.route('**/api/v1/profiles', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 'prof123', name: 'Main Profile' }])
      });
    });
    await page.route('**/api/v1/workspaces/*/subscription', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'Active', plan: 'Pro' })
      });
    });
    await page.route('**/api/v1/admin/access', async route => {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) });
    });
    await page.route('**/api/v1/hubs/notifications/negotiate**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ connectionToken: 'mock_token', connectionId: 'mock_id', negotiateVersion: 1, availableTransports: [] })
      });
    });
    await page.route('**/api/v1/workspaces/*/notifications**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], totalCount: 0 }) });
    });
    await page.route('**/api/v1/social-accounts**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 'acc_instagram123', platform: 'instagram', displayName: 'instagram_user', isActive: true, zernioProfileId: 'prof123' }],
          totalCount: 1, page: 1, pageSize: 10
        })
      });
    });

    // Mock media upload
    await page.route('**/api/v1/workspaces/*/media/upload', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock_media_123',
          fileUrl: 'http://127.0.0.1:5173/mock-image.png',
          fileName: 'mock-image.png',
          mimeType: 'image/png'
        })
      });
    });

    let postRequestPayload: any = null;
    await page.route(url => url.pathname.endsWith('/posts') || url.pathname.endsWith('/posts/zernio'), async route => {
      const m = route.request().method();
      if (m === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 10 })
        });
      }
      if (m === 'POST') {
        postRequestPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ id: 'post123', status: 'published' })
        });
      }
      await route.fallback();
    });

    // Add init script to set localStorage before the page loads
    await page.addInitScript(() => {
      window.localStorage.setItem('syncra_access_token', 'mock_jwt_token');
      window.localStorage.setItem('syncra_workspace_id', 'ws123');
    });

    // Navigate directly to posts page
    await page.goto(`${BASE_URL}/app/posts-all`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Open composer modal
    await page.click('button:has-text("Create post")', { timeout: 10000, force: true });
    await page.waitForTimeout(2000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill post caption
    await dialog.locator('textarea').first().fill('Hello Syncra Instagram E2E test!');

    // Upload mock image file to composer (Instagram requires media)
    const fileInput = dialog.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'mock-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-content')
    });
    await page.waitForTimeout(1000);

    // Select the Instagram Account card
    await dialog.getByRole('button', { name: /@instagram_user/i }).click();
    await page.waitForTimeout(1000);

    // Expand platform specific accordion
    await dialog.locator('button[class*="accordionHeader"]').click();
    await page.waitForTimeout(1000);

    // Fill Instagram spec settings
    const publishAsSelect = dialog.locator('select').first();
    await expect(publishAsSelect).toBeVisible({ timeout: 10000 });
    await publishAsSelect.selectOption('reel');
    await page.waitForTimeout(500);

    // Location ID
    await dialog.locator('input[placeholder*="locations/"]').fill('locations/123');

    // Alt Text
    await dialog.locator('textarea[placeholder*="accessibility"]').fill('My Alt Text');

    // First Comment
    await dialog.locator('textarea[placeholder*="first comment"]').fill('My First Comment');

    // Click "publish now" and confirm
    await dialog.locator('button:has-text("publish now")').click({ timeout: 10000 });
    await expect(page.locator('h3:has-text("Publish Post")')).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/posts/zernio') && r.status() === 200,
        { timeout: 15000 }
      ),
      page.getByRole('button', { name: 'Publish', exact: true }).click({ timeout: 10000 })
    ]);

    expect(postRequestPayload).toBeDefined();
    expect(postRequestPayload.socialAccountIds).toContain('acc_instagram123');
    expect(postRequestPayload.platformSpecificData.instagram.publishAs).toBe('reel');
    expect(postRequestPayload.platformSpecificData.instagram.locationId).toBe('locations/123');
    expect(postRequestPayload.platformSpecificData.instagram.altText).toBe('My Alt Text');
    expect(postRequestPayload.platformSpecificData.instagram.firstComment).toBe('My First Comment');
  });
});
