# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fe\tests\e2e\reddit-flows.spec.ts >> Reddit Integration Flow E2E Tests >> should open composer, fill Reddit options, and publish with correct payload
- Location: fe\tests\e2e\reddit-flows.spec.ts:6:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/app/posts-all
Call log:
  - navigating to "http://127.0.0.1:5173/app/posts-all", waiting until "load"

```

# Test source

```ts
  8   |     const requests: string[] = [];
  9   |     page.on('console', msg => {
  10  |       console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  11  |     });
  12  |     page.on('pageerror', err => {
  13  |       console.log('[PAGE ERROR]', err.message);
  14  |       console.log(err.stack);
  15  |     });
  16  |     page.on('request', req => {
  17  |       if (req.url().includes('/api/v1')) {
  18  |         requests.push(`${req.method()} ${req.url()}`);
  19  |       }
  20  |     });
  21  |     page.on('response', res => {
  22  |       if (res.url().includes('/api/v1')) {
  23  |         console.log(`[API RESPONSE] ${res.status()} ${res.request().method()} ${res.url()}`);
  24  |       }
  25  |     });
  26  | 
  27  |     // Mock all API endpoints
  28  |     await page.route('**/api/v1/auth/me', async route => {
  29  |       console.log('MOCK HIT: /auth/me');
  30  |       await route.fulfill({ status: 200, contentType: 'application/json',
  31  |         body: JSON.stringify({ userId: 'user123', email: 'localtest@gmail.com', displayName: 'Local Test User', firstName: 'Local', lastName: 'Test' })
  32  |       });
  33  |     });
  34  |     await page.route('**/api/v1/workspaces', async route => {
  35  |       await route.fulfill({ status: 200, contentType: 'application/json',
  36  |         body: JSON.stringify([{ id: 'ws123', name: 'My Workspace', color: '#6C3FF5' }])
  37  |       });
  38  |     });
  39  |     await page.route('**/api/v1/profiles', async route => {
  40  |       await route.fulfill({ status: 200, contentType: 'application/json',
  41  |         body: JSON.stringify([{ id: 'prof123', name: 'Main Profile' }])
  42  |       });
  43  |     });
  44  |     await page.route('**/api/v1/workspaces/*/subscription', async route => {
  45  |       await route.fulfill({ status: 200, contentType: 'application/json',
  46  |         body: JSON.stringify({ status: 'Active', plan: 'Pro' })
  47  |       });
  48  |     });
  49  |     await page.route('**/api/v1/admin/access', async route => {
  50  |       await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) });
  51  |     });
  52  |     await page.route('**/api/v1/hubs/notifications/negotiate**', async route => {
  53  |       await route.fulfill({ status: 200, contentType: 'application/json',
  54  |         body: JSON.stringify({ connectionToken: 'mock_token', connectionId: 'mock_id', negotiateVersion: 1, availableTransports: [] })
  55  |       });
  56  |     });
  57  |     await page.route('**/api/v1/workspaces/*/notifications**', async route => {
  58  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], totalCount: 0 }) });
  59  |     });
  60  |     await page.route('**/api/v1/social-accounts**', async route => {
  61  |       await route.fulfill({ status: 200, contentType: 'application/json',
  62  |         body: JSON.stringify({
  63  |           items: [{ id: 'acc_reddit123', platform: 'reddit', displayName: 'reddit_user', isActive: true, zernioProfileId: 'prof123' }],
  64  |           totalCount: 1, page: 1, pageSize: 10
  65  |         })
  66  |       });
  67  |     });
  68  |     await page.route('**/api/v1/social-accounts/*/reddit/subreddits', async route => {
  69  |       await route.fulfill({ status: 200, contentType: 'application/json',
  70  |         body: JSON.stringify({
  71  |           subreddits: [{ id: 'sub1', name: 'marketing', title: 'Marketing Community', url: '/r/marketing', over18: false }],
  72  |           defaultSubreddit: 'marketing'
  73  |         })
  74  |       });
  75  |     });
  76  |     await page.route('**/api/v1/social-accounts/*/reddit/flairs*', async route => {
  77  |       await route.fulfill({ status: 200, contentType: 'application/json',
  78  |         body: JSON.stringify({
  79  |           flairs: [{ id: 'flair1', text: 'Discussion', textColor: '#ffffff', backgroundColor: '#000000' }]
  80  |         })
  81  |       });
  82  |     });
  83  | 
  84  |     let postRequestPayload: any = null;
  85  |     await page.route(url => url.pathname.endsWith('/posts') || url.pathname.endsWith('/posts/zernio'), async route => {
  86  |       const m = route.request().method();
  87  |       if (m === 'GET') {
  88  |         return route.fulfill({ status: 200, contentType: 'application/json',
  89  |           body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 10 })
  90  |         });
  91  |       }
  92  |       if (m === 'POST') {
  93  |         postRequestPayload = route.request().postDataJSON();
  94  |         return route.fulfill({ status: 200, contentType: 'application/json',
  95  |           body: JSON.stringify({ id: 'post123', status: 'published' })
  96  |         });
  97  |       }
  98  |       await route.fallback();
  99  |     });
  100 | 
  101 |     // Add init script to set localStorage before the page loads
  102 |     await page.addInitScript(() => {
  103 |       window.localStorage.setItem('syncra_access_token', 'mock_jwt_token');
  104 |       window.localStorage.setItem('syncra_workspace_id', 'ws123');
  105 |     });
  106 | 
  107 |     // Navigate directly to posts page
> 108 |     await page.goto(`${BASE_URL}/app/posts-all`, { waitUntil: 'load', timeout: 15000 });
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/app/posts-all
  109 |     await page.waitForTimeout(2000);
  110 | 
  111 | 
  112 | 
  113 |     // Open the composer modal
  114 |     await page.click('button:has-text("Create post")', { timeout: 10000, force: true });
  115 |     await page.waitForTimeout(2000);
  116 | 
  117 |     const dialog = page.locator('[role="dialog"]');
  118 |     await expect(dialog).toBeVisible({ timeout: 10000 });
  119 | 
  120 |     await dialog.locator('textarea').first().fill('Hello Syncra Reddit E2E test!');
  121 | 
  122 |     await dialog.getByRole('button', { name: /@reddit_user/i }).click();
  123 |     await page.waitForTimeout(1000);
  124 | 
  125 |     // Expand Reddit setting accordion
  126 |     await dialog.locator('button[class*="accordionHeader"]').click();
  127 |     await page.waitForTimeout(1000);
  128 | 
  129 |     const subSelect = dialog.locator('select').first();
  130 |     await expect(subSelect).toBeVisible({ timeout: 10000 });
  131 |     await subSelect.selectOption('marketing');
  132 |     await page.waitForTimeout(500);
  133 | 
  134 |     const flairSel = dialog.locator('select').nth(1);
  135 |     if (await flairSel.isVisible({ timeout: 3000 }).catch(() => false)) {
  136 |       await flairSel.selectOption('flair1');
  137 |     }
  138 | 
  139 |     await dialog.locator('input[placeholder*="Reddit requires"]').fill('My Automated Reddit Title');
  140 | 
  141 |     await dialog.locator('button:has-text("publish now")').click({ timeout: 10000 });
  142 |     await expect(page.locator('h3:has-text("Publish Post")')).toBeVisible({ timeout: 5000 });
  143 |     await Promise.all([
  144 |       page.waitForResponse(
  145 |         r => r.url().includes('/posts/zernio') && r.status() === 200,
  146 |         { timeout: 15000 }
  147 |       ),
  148 |       page.getByRole('button', { name: 'Publish', exact: true }).click({ timeout: 10000 })
  149 |     ]);
  150 | 
  151 |     expect(postRequestPayload).toBeDefined();
  152 |     expect(postRequestPayload.socialAccountIds).toContain('acc_reddit123');
  153 |     expect(postRequestPayload.platformSpecificData.reddit.subreddit).toBe('marketing');
  154 |     expect(postRequestPayload.platformSpecificData.reddit.title).toBe('My Automated Reddit Title');
  155 |     expect(postRequestPayload.platformSpecificData.reddit.flairId).toBe('flair1');
  156 |   });
  157 | });
  158 | 
```