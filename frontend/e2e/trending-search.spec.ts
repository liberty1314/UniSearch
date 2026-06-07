import { expect, test } from '@playwright/test';
import { mockPublicApis, signIn } from './test-helpers';

test('热门榜单卡片可以跳转到搜索结果', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);

  await page.goto('/trending');
  await expect(page.getByText('沙丘2')).toBeVisible();
  await page.getByTestId('hot-media-card').first().getByRole('button', { name: '搜索' }).click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('沙丘2 资源合集')).toBeVisible();
});
