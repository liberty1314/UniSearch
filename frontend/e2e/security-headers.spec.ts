import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockAdminApis, mockPublicApis, signIn } from './test-helpers';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const nginxConfig = readFileSync(path.resolve(dirname, '../../nginx.conf'), 'utf8');
const frontendBaseURL = process.env.UNISEARCH_FRONTEND_BASE_URL || 'http://127.0.0.1:4173';

const apiEnvelope = <T>(data: T) => ({
  code: 200,
  message: '成功',
  data,
});

const readEnforcedCSP = () => {
  const policies = Array.from(
    nginxConfig.matchAll(/add_header Content-Security-Policy "([^"]+)" always;/g),
    (match) => match[1],
  );
  expect(policies, 'Nginx 必须在所有响应位置配置强制 Content-Security-Policy').toHaveLength(4);
  expect(new Set(policies).size, 'Nginx 的强制 CSP 必须保持统一').toBe(1);
  return policies[0] || '';
};

const installCSPMonitor = async (page: Page, policy: string) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy') || message.text().startsWith('CSP:')) {
      violations.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    violations.push(`PAGE:${error.message}`);
  });
  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `CSP:${event.effectiveDirective}:${event.blockedURI}:${event.sourceFile}:${event.lineNumber}`,
      );
    });
  });
  await page.route(`${frontendBaseURL}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': policy,
      },
    });
  });
  return violations;
};

const expectNoBrowserViolations = async (page: Page, violations: string[]) => {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(violations).toEqual([]);
};

test('生产 CSP 使用最小来源并可运行首页', async ({ page }) => {
  const policy = readEnforcedCSP();
  expect(nginxConfig).not.toContain('Content-Security-Policy-Report-Only');
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy.match(/script-src[^;]*/)?.[0] || '').not.toContain("'unsafe-inline'");
  expect(policy).not.toContain('https:;');

  await mockPublicApis(page);
  const violations = await installCSPMonitor(page, policy);
  const response = await page.goto('/');

  expect(response?.headers()['content-security-policy']).toBe(policy);
  await expect(page.getByPlaceholder('搜索网盘资源...')).toBeVisible();
  await expectNoBrowserViolations(page, violations);
});

test('登录、主题切换、搜索和结果动画在强制 CSP 下可用', async ({ page }) => {
  await mockPublicApis(page);
  const violations = await installCSPMonitor(page, readEnforcedCSP());

  await page.goto('/login');
  const loginForm = page.locator('form').filter({ has: page.getByLabel('用户名') });
  await page.getByLabel('用户名').fill('e2e-user');
  await page.locator('#password').fill('Secret123!');
  await loginForm.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(`${frontendBaseURL}/`);

  const wasDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  await page.getByRole('button', { name: '切换主题' }).click();
  await expect.poll(
    () => page.locator('html').evaluate((element) => element.classList.contains('dark')),
  ).toBe(!wasDark);

  await page.getByPlaceholder('搜索网盘资源...').fill('流浪地球');
  await page.getByRole('button', { name: '搜索' }).first().click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText('流浪地球 资源合集')).toBeVisible();
  await expect(page.locator('[data-testid="search-transition-view"][data-view="results"]')).toBeVisible();
  await expectNoBrowserViolations(page, violations);
});

test('注册页通过 Turnstile 精确来源完成验证和注册', async ({ page }) => {
  await mockPublicApis(page);
  await page.route('**/api/system-settings', async (route) => {
    await route.fulfill({
      json: {
        enable_user_auth: true,
        enable_user_login: true,
        enable_user_signup: true,
        enable_signup_captcha: true,
        signup_captcha_provider: 'turnstile',
        signup_captcha_site_key: 'e2e-site-key',
        enable_resource_detail_page: true,
        public_site_url: '',
        default_copy_format_template: '',
      },
    });
  });
  await page.route('**/api/auth/check-username?**', async (route) => {
    await route.fulfill({ json: apiEnvelope(true) });
  });
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = {
        render: function (container, options) {
          container.setAttribute('data-testid', 'turnstile-mock');
          container.textContent = 'Turnstile 已验证';
          queueMicrotask(function () { options.callback('e2e-turnstile-token'); });
          return 'e2e-widget';
        },
        remove: function () {}
      };`,
    });
  });
  let registrationBody: Record<string, unknown> | undefined;
  await page.route('**/api/auth/register', async (route) => {
    registrationBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: apiEnvelope({
        access_token: 'e2e-register-token',
        expires_at: 1_800_000_000,
        username: 'e2e-register',
      }),
    });
  });
  const violations = await installCSPMonitor(page, readEnforcedCSP());

  await page.goto('/register');
  await expect(page.getByTestId('turnstile-mock')).toBeVisible();
  await page.getByLabel('用户名').fill('e2e-register');
  await page.locator('#password').fill('Secret123!');
  await page.locator('#confirmPassword').fill('Secret123!');
  await page.getByRole('button', { name: '立即注册' }).click();

  await expect(page).toHaveURL(`${frontendBaseURL}/`);
  expect(registrationBody).toMatchObject({
    username: 'e2e-register',
    captcha_token: 'e2e-turnstile-token',
  });
  await expectNoBrowserViolations(page, violations);
});

test('管理员后台和详情抽屉在强制 CSP 下可用', async ({ page }) => {
  await mockPublicApis(page);
  await mockAdminApis(page);
  await signIn(page, { admin: true });
  const violations = await installCSPMonitor(page, readEnforcedCSP());

  await page.goto('/admin?view=plugin_management');
  await expect(
    page.locator('section').getByRole('heading', { name: '插件中心' }),
  ).toBeVisible();
  await expect(page.getByText('pan666', { exact: true }).filter({ visible: true })).toBeVisible();

  await page.getByRole('button', { name: /查看插件 pan666 详情/ }).filter({ visible: true }).click();
  await expect(page.getByTestId('plugin-management-drawer')).toBeVisible();
  await page.getByRole('button', { name: '切换主题' }).click();
  await expectNoBrowserViolations(page, violations);
});
