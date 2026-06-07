import { expect, test } from '@playwright/test';
import { mockPublicApis, signIn } from './test-helpers';

test('首页搜索会进入搜索页并展示结果', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);

  await page.goto('/');
  await page.getByPlaceholder('搜索网盘资源...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).first().click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('流浪地球 资源合集')).toBeVisible();
});
