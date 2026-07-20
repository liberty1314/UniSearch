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
  await expect(page.getByTestId('search-query-dock')).toBeVisible();
  await expect(page.getByTestId('search-results-stage')).toBeVisible();
  await expect(page.getByText('搜索启动台')).toHaveCount(0);
});

test('首页搜索后快速清空仍显示空态输入框', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);

  await page.goto('/');
  await page.getByPlaceholder('搜索网盘资源...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).first().click();
  await expect(page).toHaveURL(/\/search\?q=/);

  const dock = page.getByTestId('search-query-dock');
  await expect(dock).toBeVisible();
  await dock.getByRole('button', { name: '清空输入' }).click();

  const idleInput = page.getByPlaceholder('搜索电影、课程、软件或资料...');
  await expect(idleInput).toBeVisible();
  await page.waitForTimeout(700);
  const state = await idleInput.evaluate((element) => {
    let host: HTMLElement | null = element.parentElement;
    for (let index = 0; index < 3 && host; index += 1) {
      host = host.parentElement;
    }

    if (!host) {
      throw new Error('缺少输入框动画父级');
    }

    const style = getComputedStyle(host);
    return { opacity: Number(style.opacity), transform: style.transform };
  });

  expect(state.opacity).toBe(1);
  expect(state.transform).toBe('none');
});
