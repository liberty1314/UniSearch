import { expect, test } from '@playwright/test';
import { mockAdminApis, mockPublicApis, signIn } from './test-helpers';

test('管理员可以进入插件中心并看到插件目录', async ({ page }) => {
  await mockPublicApis(page);
  await mockAdminApis(page);
  await signIn(page, { admin: true });

  await page.goto('/admin?view=plugin_management');

  await expect(
    page.locator('section').getByRole('heading', { name: '插件中心' }),
  ).toBeVisible();
  const pluginTable = page.getByRole('region', { name: '数据表格' });
  await expect(
    pluginTable.getByText('pan666', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    pluginTable.getByText('E2E 插件目录项').filter({ visible: true }),
  ).toBeVisible();
});
