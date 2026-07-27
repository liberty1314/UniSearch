import { expect, test, type Page } from '@playwright/test';
import { mockPublicApis, signIn } from './test-helpers';

interface SourceFixture {
  id: string;
  count: number;
}

const keyword = '质量测试';

const facets = {
  cloud_types: { quark: 100 },
  source_types: { plugin: 100 },
  media_types: { movie: 100 },
  target_types: { share: 100 },
  capabilities: { downloadable: 100 },
  action_types: { open_link: 100 },
};

const createResource = (sourceId: string, index: number) => {
  const suffix = String(index).padStart(2, '0');
  const resourceId = `${sourceId}-${suffix}`;
  const deferred = sourceId === 'source-a' && index === 1;

  return {
    id: resourceId,
    title: `${keyword} ${sourceId} ${suffix}`,
    description: '',
    source: {
      type: 'plugin',
      id: sourceId,
      name: sourceId,
      plugin_id: sourceId,
    },
    media_type: 'movie',
    target_type: 'share',
    links: deferred
      ? [{
          id: 'link-deferred-1',
          type: 'quark',
          access_mode: 'resolve_required',
          resolution: {
            status: 'deferred',
            token: 'opaque-resolve-token',
            expires_at: '2026-07-14T00:00:00Z',
          },
          title: `${keyword} deferred`,
        }]
      : [{
          id: `link-${resourceId}`,
          type: 'quark',
          url: `https://example.com/${resourceId}`,
          access_mode: 'direct_open',
          title: `${keyword} direct`,
        }],
    capabilities: { searchable: true, downloadable: true },
    actions: [],
    detail: {},
    tags: [],
    images: [],
    meta: {},
    published_at: '2026-07-13T00:00:00Z',
  };
};

const createSearchResponse = (sources: SourceFixture[]) => {
  const resources = sources.flatMap((source) =>
    Array.from({ length: source.count }, (_, index) =>
      createResource(source.id, index + 1),
    ),
  );

  return {
    code: 200,
    message: '成功',
    data: {
      total: resources.length,
      resources,
      facets,
      warnings: [],
    },
  };
};

const prepareScenario = async (page: Page, sources: SourceFixture[]) => {
  await mockPublicApis(page);
  await signIn(page);

  await page.unroute('**/api/system-settings');
  await page.route('**/api/system-settings', async (route) => {
    await route.fulfill({
      json: {
        enable_user_auth: true,
        enable_user_login: true,
        enable_user_signup: true,
        enable_resource_detail_page: false,
        enable_resource_source_badges: false,
        enable_search_source_diversity: true,
        search_first_page_max_per_source: 16,
        progressive_search_enabled: false,
        public_site_url: '',
        default_copy_format_template: '',
      },
    });
  });

  await page.unroute('**/api/search');
  await page.route('**/api/search', async (route) => {
    await route.fulfill({ json: createSearchResponse(sources) });
  });
};

const readFirstPageCounts = async (page: Page) =>
  page.locator('[data-resource-id]').evaluateAll((nodes) => {
    const counts: Record<string, number> = {};
    for (const node of nodes.slice(0, 48)) {
      const sourceId = node.getAttribute('data-source-id') || 'unknown';
      counts[sourceId] = (counts[sourceId] || 0) + 1;
    }
    return counts;
  });

test('首屏来源充足时按 16/48 配额展示且仅点击时解析', async ({ page }) => {
  await prepareScenario(page, [
    { id: 'source-a', count: 60 },
    { id: 'source-b', count: 20 },
    { id: 'source-c', count: 20 },
  ]);

  let resolverCalls = 0;
  let resolverPayload: Record<string, unknown> | null = null;
  await page.route('**/api/resources/resolve', async (route) => {
    resolverCalls += 1;
    resolverPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 410,
      json: {
        code: 410,
        message: '当前资源已失效',
        error_code: 'RESOURCE_INVALID',
      },
    });
  });

  await page.goto(`/search?q=${encodeURIComponent(keyword)}&src=all`);

  const cards = page.locator('[data-resource-id]');
  await expect(cards).toHaveCount(48);
  await expect.poll(() => readFirstPageCounts(page)).toEqual({
    'source-a': 16,
    'source-b': 16,
    'source-c': 16,
  });
  expect(resolverCalls).toBe(0);

  await page
    .getByRole('button', { name: /切换为(列表|网格)视图/ })
    .click();
  await expect(cards).toHaveCount(48);
  await page.locator('[data-resource-id="source-a-01"]').click();

  await expect.poll(() => resolverCalls).toBe(1);
  expect(resolverPayload).toEqual({
    resource_id: 'source-a-01',
    link_id: 'link-deferred-1',
    resolve_token: 'opaque-resolve-token',
  });
  expect(JSON.stringify(resolverPayload)).not.toMatch(/url/i);
});

test('来源不足时按原顺序回填且延后结果可继续加载', async ({ page }) => {
  await prepareScenario(page, [
    { id: 'source-a', count: 60 },
    { id: 'source-b', count: 10 },
    { id: 'source-c', count: 10 },
  ]);

  await page.goto(`/search?q=${encodeURIComponent(keyword)}&src=all`);

  const cards = page.locator('[data-resource-id]');
  await expect(cards).toHaveCount(48);
  await expect.poll(() => readFirstPageCounts(page)).toEqual({
    'source-a': 28,
    'source-b': 10,
    'source-c': 10,
  });
  await expect(page.locator('[data-resource-id="source-a-28"]')).toBeVisible();
  await expect(page.locator('[data-resource-id="source-a-29"]')).toHaveCount(0);

  const loadMoreButton = page.getByTestId('search-results-load-more');
  await loadMoreButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => cards.count()).not.toBe(48);
  await loadMoreButton.evaluate((button) => (button as HTMLButtonElement).click());

  await expect(loadMoreButton).toHaveCount(0);
  await expect(page.getByText('已加载全部 80 条结果')).toBeAttached();
});
