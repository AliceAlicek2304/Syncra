import { test, expect } from '@playwright/test';

test.describe('Reddit Integration Flow E2E Tests', () => {
  const BASE_URL = 'http://127.0.0.1:5173';

  test('should open composer, fill Reddit options, and publish with correct payload', async ({ page }) => {
    // Set up request logging
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
    page.on('response', res => {
      if (res.url().includes('/api/v1')) {
        console.log(`[API RESPONSE] ${res.status()} ${res.request().method()} ${res.url()}`);
      }
    });

    // Mock all API endpoints
    await page.route('**/api/v1/auth/me', async route => {
      console.log('MOCK HIT: /auth/me');
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
          items: [{ id: 'acc_reddit123', platform: 'reddit', displayName: 'reddit_user', isActive: true, zernioProfileId: 'prof123' }],
          totalCount: 1, page: 1, pageSize: 10
        })
      });
    });
    await page.route('**/api/v1/social-accounts/*/reddit/subreddits', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({
          subreddits: [{ id: 'sub1', name: 'marketing', title: 'Marketing Community', url: '/r/marketing', over18: false }],
          defaultSubreddit: 'marketing'
        })
      });
    });
    await page.route('**/api/v1/social-accounts/*/reddit/flairs*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({
          flairs: [{ id: 'flair1', text: 'Discussion', textColor: '#ffffff', backgroundColor: '#000000' }]
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



    // Open the composer modal
    await page.click('button:has-text("Create post")', { timeout: 10000, force: true });
    await page.waitForTimeout(2000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await dialog.locator('textarea').first().fill('Hello Syncra Reddit E2E test!');

    await dialog.getByRole('button', { name: /@reddit_user/i }).click();
    await page.waitForTimeout(1000);

    // Expand Reddit setting accordion
    await dialog.locator('button[class*="accordionHeader"]').click();
    await page.waitForTimeout(1000);

    const subSelect = dialog.locator('select').first();
    await expect(subSelect).toBeVisible({ timeout: 10000 });
    await subSelect.selectOption('marketing');
    await page.waitForTimeout(500);

    const flairSel = dialog.locator('select').nth(1);
    if (await flairSel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await flairSel.selectOption('flair1');
    }

    await dialog.locator('input[placeholder*="Reddit requires"]').fill('My Automated Reddit Title');

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
    expect(postRequestPayload.socialAccountIds).toContain('acc_reddit123');
    expect(postRequestPayload.platformSpecificData.reddit.subreddit).toBe('marketing');
    expect(postRequestPayload.platformSpecificData.reddit.title).toBe('My Automated Reddit Title');
    expect(postRequestPayload.platformSpecificData.reddit.flairId).toBe('flair1');
  });
});
