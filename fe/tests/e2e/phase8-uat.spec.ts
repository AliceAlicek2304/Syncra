import { test, expect } from '@playwright/test';

// Mock helper
const mockAuth = async (page: Page) => {
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ userId: '1', email: 'test@a.com', displayName: 'Test User', firstName: 'Test', lastName: 'User' }) });
  });
  await page.context().addInitScript(() => localStorage.setItem('syncra_access_token', 'mock-token'));
};

test.describe('UAT Phase 8: Workspace, Settings, UI', () => {
  
  // ✅ Test 3: Workspace Selection & Persistence
  test('3. Workspace Selection & Persistence', async ({ page }) => {
    await mockAuth(page);
    await page.route('**/api/v1/workspaces', async (route: Route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([
        { id: 'w1', name: 'Personal', slug: 'personal' },
        { id: 'w2', name: 'Work', slug: 'work' }
      ]) });
    });

    await page.goto('app/dashboard');
    await page.getByTestId('workspace-selector').click();
    await page.getByTestId('workspace-option').filter({ hasText: 'Work' }).click();

    const wsId = await page.evaluate(() => localStorage.getItem('syncra_workspace_id'));
    expect(wsId).toBe('w2');

    await page.reload();
    await expect(page.getByTestId('workspace-selector')).toContainText('Work');
  });

  // ✅ Test 4: Route Protection
  test('4. Route Protection', async ({ page }) => {
    await page.context().addInitScript(() => localStorage.clear());
    await page.goto('app/dashboard');
    
    // Sẽ bị redirect về homepage và mở login modal
    await expect(page).toHaveURL(/\/Syncra\/(login)?$/);
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  // ✅ Test 5: Profile Settings Persistence
  test('5. Profile Settings Persistence', async ({ page }) => {
    await mockAuth(page);
    await page.route('**/api/v1/users/me', async (route: Route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ userId: '1', email: 'test@a.com', firstName: 'Updated', lastName: 'Name' }) });
    });

    await page.goto('app/settings');
    await page.getByTestId('profile-firstname').fill('Updated');
    await page.getByTestId('profile-lastname').fill('Name');
    await page.getByTestId('settings-submit').click();

    await expect(page.getByTestId('toast-message')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('profile-firstname')).toHaveValue('Updated');
  });

  // ✅ Test 6: Workspace Settings Persistence
  test('6. Workspace Settings Persistence', async ({ page }) => {
    await mockAuth(page);
    await page.route('**/api/v1/workspaces', async (route: Route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([{ id: 'w1', name: 'NewName', slug: 'new' }]) });
    });
    await page.route('**/api/v1/workspaces/w1', async (route: Route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: 'w1', name: 'NewName', slug: 'new' }) });
    });

    await page.goto('app/settings');
    await page.getByTestId('workspace-name').fill('NewName');
    await page.getByTestId('settings-submit').click();

    await expect(page.getByTestId('toast-message')).toBeVisible();
  });

  // ✅ Test 7: Global Error Notifications
  test('7. Global Error Notifications', async ({ page }) => {
    await mockAuth(page);
    // Mock the profile update to fail
    await page.route('**/api/v1/users/me', async (route: Route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'Failed to update profile' }) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ userId: '1', email: 'test@a.com' }) });
      }
    });

    await page.goto('app/settings');
    await page.getByTestId('profile-firstname').fill('Error Test');
    await page.getByTestId('settings-submit').click();

    await expect(page.getByTestId('toast-message')).toContainText('Failed to update profile');
  });

  // ✅ Test 8: Glass Skeleton Loaders
  test('8. Glass Skeleton Loaders', async ({ page }) => {
    await mockAuth(page);
    await page.route('**/api/v1/workspaces', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
      await route.fulfill({ status: 200, body: JSON.stringify([{ id: 'w1', name: 'Test', slug: 'test' }]) });
    });

    await page.goto('app/dashboard');
    await expect(page.getByTestId('skeleton-loader')).toBeVisible(); // Hiện skeleton khi đang load
    await expect(page.getByTestId('workspace-selector')).toBeVisible({ timeout: 3000 }); // Biến mất khi có data
    await expect(page.getByTestId('skeleton-loader')).not.toBeVisible();
  });
});
