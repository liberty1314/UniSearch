import { expect, test } from '@playwright/test';
import { mockPublicApis } from './test-helpers';

test('匿名搜索登录后会恢复原关键词', async ({ page }) => {
  await mockPublicApis(page);

  await page.goto('/');
  await page.getByPlaceholder('搜索网盘资源...').fill('星际穿越');
  await page.getByRole('button', { name: '搜索' }).first().click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('登录后继续搜索：星际穿越')).toBeVisible();
  await expect(page.locator('.auth-switch-stage')).toHaveCSS('transform', 'none');

  const usernameInput = page.getByLabel('用户名');
  const passwordInput = page.getByRole('textbox', { name: '密码' });
  const loginForm = page.locator('form').filter({ has: usernameInput });
  await usernameInput.fill('e2e-user');
  await passwordInput.fill('password');
  await expect(usernameInput).toHaveValue('e2e-user');
  await expect(passwordInput).toHaveValue('password');
  await loginForm.evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('星际穿越 资源合集')).toBeVisible();
});
