import { expect, test } from '@playwright/test';
import { mockPublicApis, signIn } from './test-helpers';

test('空搜索页只展示碎片画布且不请求热榜', async ({ page }, testInfo) => {
  let hotRequestCount = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/hot?')) {
      hotRequestCount += 1;
    }
  });
  await mockPublicApis(page);
  await signIn(page);

  await page.goto('/search');

  await expect(page.getByTestId('search-stage')).toBeVisible();
  await expect(page.getByText('多源索引 / 就绪')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('heading', {
    name: '从一个关键词，找到更多可能',
  })).toHaveCount(0);
  await expect(page.getByText('搜索启动台')).toHaveCount(0);
  await expect(page.getByText('最近有效搜索')).toHaveCount(0);
  await expect(page.getByText('热榜直搜')).toHaveCount(0);
  expect(hotRequestCount).toBe(0);

  await page.screenshot({
    path: testInfo.outputPath('search-canvas-idle.png'),
    fullPage: true,
  });
});

test('提交搜索后查询条接管并展示结果', async ({ page }, testInfo) => {
  await mockPublicApis(page);
  await signIn(page);
  await page.goto('/search');

  await page.getByPlaceholder('搜索电影、课程、软件或资料...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByTestId('search-query-dock')).toBeVisible();
  await expect(page.getByText('流浪地球 资源合集')).toBeVisible();
  await expect(page.getByTestId('search-stage')).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('search-canvas-results.png'),
    fullPage: true,
  });
});

test('清空首次搜索后可以通过按钮再次搜索', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);
  await page.goto('/search');

  const searchButton = page
    .getByTestId('search-box-surface')
    .getByRole('button', { name: '搜索', exact: true });

  await page.getByPlaceholder('搜索电影、课程、软件或资料...').fill('流浪地球');
  await searchButton.click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('流浪地球 资源合集')).toBeVisible();

  await page.getByRole('button', { name: '清空输入' }).click();
  await expect(page).toHaveURL('/search');

  await page.getByPlaceholder('搜索电影、课程、软件或资料...').fill('你的名字');
  await searchButton.click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('你的名字 资源合集')).toBeVisible();
});

test('结果态筛选卡片在内容轨道内居中且移动端不溢出', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);
  await page.goto('/search');

  await page.getByPlaceholder('搜索电影、课程、软件或资料...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).click();

  const filterCard = page.getByTestId('search-unified-filter-card');
  await expect(filterCard).toBeVisible();
  await expect(filterCard.locator('..')).toHaveClass(/mx-auto/);

  const geometry = await filterCard.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      center: rect.left + rect.width / 2,
      viewport: window.innerWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(Math.abs(geometry.center - geometry.viewport / 2)).toBeLessThanOrEqual(1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
});

test('结果视图挂载时不被退出的空态画布推到下方', async ({ page }) => {
  await mockPublicApis(page);
  await signIn(page);
  await page.goto('/search');

  await page.getByPlaceholder('搜索电影、课程、软件或资料...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).click();

  const resultView = page.locator(
    '[data-testid="search-transition-view"][data-view="results"]',
  );
  await expect(resultView).toHaveCount(1);
  const offset = await resultView.evaluate((element) => {
    const shell = element.closest('[data-testid="search-transition-shell"]');
    if (!shell) {
      throw new Error('缺少搜索过渡壳');
    }

    return element.getBoundingClientRect().top - shell.getBoundingClientRect().top;
  });

  expect(offset).toBeLessThan(120);
});

test('移动端只显示 6 个碎片并支持减少动态效果', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockPublicApis(page);
  await signIn(page);
  await page.goto('/search');

  await expect(page.getByTestId('search-fragment-field')).toHaveAttribute(
    'data-reduced-motion',
    'true',
  );
  await expect(
    page.locator('[data-testid^="search-fragment-"][data-mobile-hidden]:visible'),
  ).toHaveCount(6);

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
