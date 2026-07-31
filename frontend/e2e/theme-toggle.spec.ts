import { expect, test } from '@playwright/test';
import { mockPublicApis } from './test-helpers';

const ACCOUNT_PREFERENCES_STORAGE_KEY = 'unisearch_account_preferences';

test.beforeEach(async ({ page }) => {
  await mockPublicApis(page);
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        theme: 'light',
        resultView: 'list',
        defaultCloudTypes: ['aliyun'],
      })
    );
    window.localStorage.setItem('theme', 'light');
  }, ACCOUNT_PREFERENCES_STORAGE_KEY);
});

test('主题按钮使用作用域化圆形过渡并在完成后清理状态', async ({ page }) => {
  await page.goto('/');

  const themeButton = page.getByRole('button', { name: '切换到深色主题' }).first();
  await expect(themeButton).toBeVisible();
  const buttonBox = await themeButton.boundingBox();
  expect(buttonBox?.width).toBeCloseTo(36, 4);
  expect(buttonBox?.height).toBeCloseTo(36, 4);

  const transitionRules = await page.evaluate(() => {
    const styleRules: CSSStyleRule[] = [];
    const collectRules = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          styleRules.push(rule);
        }
        if ('cssRules' in rule) {
          collectRules((rule as CSSGroupingRule).cssRules);
        }
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      collectRules(sheet.cssRules);
    }

    return styleRules
      .filter((rule) => rule.selectorText.includes('data-magicui-theme-vt'))
      .map((rule) => rule.cssText);
  });

  expect(transitionRules).toEqual(
    expect.arrayContaining([
      expect.stringContaining('::view-transition-group(root)'),
      expect.stringContaining('::view-transition-new(root)'),
    ])
  );

  await themeButton.evaluate((button) => button.click());

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.magicuiThemeVt))
    .toBe('active');
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--magicui-theme-toggle-vt-duration')
    )
  ).toBe('400ms');

  const storedPreferences = await page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? '{}');
  }, ACCOUNT_PREFERENCES_STORAGE_KEY);
  expect(storedPreferences).toEqual({
    theme: 'dark',
    resultView: 'list',
    defaultCloudTypes: ['aliyun'],
  });

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.magicuiThemeVt))
    .toBeUndefined();
  await expect(page.getByRole('button', { name: '切换到浅色主题' }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--magicui-theme-toggle-vt-duration')
    )
  ).toBe('');
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--magicui-theme-vt-clip-from')
    )
  ).toBe('');
});
