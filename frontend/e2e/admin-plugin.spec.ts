import { expect, test } from '@playwright/test';
import { mockAdminApis, mockPublicApis, signIn } from './test-helpers';

test('管理员可以进入插件中心并看到插件目录', async ({ page }) => {
  await mockPublicApis(page);
  await mockAdminApis(page);
  await signIn(page, { admin: true });

  await page.goto('/admin?view=plugin_management');

  await expect(page.getByRole('heading', { name: '插件中心' })).toBeVisible();
  const pluginCard = page.getByTestId('plugin-market-card-pan666');
  await expect(pluginCard).toBeVisible();
  await expect(pluginCard.getByText('E2E 插件目录项')).toBeVisible();
});
