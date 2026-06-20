import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBaseURL = process.env.UNISEARCH_API_BASE_URL || 'http://localhost:8888';
const keyword = process.env.UNISEARCH_REAL_E2E_KEYWORD || '流浪地球';
const username = `codexqa_e2e_${Date.now().toString(36)}`;
const password = `CodexQA${Date.now().toString(36)}x9`;
const dirname = path.dirname(fileURLToPath(import.meta.url));
const cleanupScript = path.resolve(dirname, '../../scripts/tests/cleanup-test-data.sh');

let accessToken = '';
const consoleErrors: string[] = [];

test.beforeAll(async ({ request }) => {
  const response = await request.post(`${apiBaseURL}/api/auth/register`, {
    data: {
      username,
      password,
    },
  });
  expect(response.ok(), `注册真实 E2E 测试用户失败: ${response.status()}`).toBeTruthy();

  const payload = await response.json();
  accessToken = payload?.data?.access_token || payload?.data?.accessToken || '';
  expect(accessToken, '真实 E2E 注册响应未返回 access token').not.toBe('');
});

test.afterAll(() => {
  try {
    execFileSync(cleanupScript, [username], { stdio: 'inherit' });
  } catch {
    console.warn(`真实 E2E 测试用户清理失败，请按需手动清理: ${username}`);
  }
});

test('真实后端登录态搜索会展示结果或来源 warning', async ({ page }) => {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.addInitScript(({ token, currentUsername }) => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          token,
          refreshToken: null,
          username: currentUsername,
          isAuthenticated: true,
          isAdmin: false,
        },
        version: 0,
      }),
    );
  }, {
    token: accessToken,
    currentUsername: username,
  });

  const searchResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/search') && response.status() === 200,
  );

  await page.goto(`/search?q=${encodeURIComponent(keyword)}&src=all&refresh=true`);
  const searchResponse = await searchResponsePromise;
  expect(searchResponse.status()).toBe(200);

  const resultOrWarning = page
    .getByTestId('search-results-toolbar')
    .or(page.getByText(/部分来源异常|暂无结果|个结果/))
    .first();
  await expect(resultOrWarning).toBeVisible({ timeout: 30_000 });
  expect(consoleErrors).toEqual([]);
});
