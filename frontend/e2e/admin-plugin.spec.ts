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

test('禁用筛选下停用异常插件开关显示已停用', async ({ page }) => {
  await mockPublicApis(page);
  await mockAdminApis(page);
  await signIn(page, { admin: true });

  await page.goto('/admin?view=plugin_management');

  await page.getByRole('combobox', { name: '插件状态筛选' }).click();
  await page.getByRole('option', { name: '禁用' }).click();

  const pluginCard = page.getByTestId('plugin-market-card-javdb');
  await expect(pluginCard).toBeVisible();
  await expect(pluginCard.getByText('异常')).toBeVisible();

  const statusSwitch = pluginCard.getByRole('switch', {
    name: '插件 javdb 当前已停用',
  });
  await expect(statusSwitch).toBeVisible();
  await expect(statusSwitch).toHaveAttribute('aria-checked', 'false');
});
