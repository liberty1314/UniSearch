import type { Page } from '@playwright/test';

const apiEnvelope = <T>(data: T) => ({
  code: 200,
  message: '成功',
  data,
});

const e2eUserToken =
  '<API_KEY>';
const e2eAdminToken =
  '<API_KEY>';

const publicSettings = {
  enable_user_auth: true,
  enable_user_login: true,
  enable_user_signup: true,
  enable_resource_detail_page: true,
  public_site_url: '',
  default_copy_format_template: '',
};

const facets = {
  cloud_types: { aliyun: 1 },
  source_types: { plugin: 1 },
  media_types: { movie: 1 },
  target_types: { resource: 1 },
  capabilities: { downloadable: 1 },
  action_types: { open: 1 },
};

const createSearchResponse = (keyword: string) =>
  apiEnvelope({
    total: 1,
    resources: [
      {
        id: `resource-${encodeURIComponent(keyword)}`,
        title: `${keyword} 资源合集`,
        description: 'E2E 模拟搜索结果',
        source: {
          type: 'plugin',
          name: 'pan666',
          plugin_id: 'pan666',
        },
        media_type: 'movie',
        target_type: 'resource',
        links: [
          {
            type: 'aliyun',
            url: 'https://example.com/share',
            password: '',
            title: `${keyword} 网盘链接`,
          },
        ],
        capabilities: {
          downloadable: true,
          searchable: true,
        },
        actions: [],
        detail: {
          url: 'https://example.com/detail',
          content: 'E2E 详情',
          unique_id: `resource-${encodeURIComponent(keyword)}`,
        },
        tags: ['E2E'],
        images: [],
        published_at: '2026-06-07T00:00:00Z',
      },
    ],
    facets,
    warnings: [],
  });

const createProgressiveSearchBody = (keyword: string) => {
  const response = createSearchResponse(keyword).data;
  return [
    {
      type: 'started',
      keyword,
      completed_sources: 0,
      total_sources: 1,
      received_batches: 0,
    },
    {
      type: 'batch',
      keyword,
      resources: response.resources,
      warnings: response.warnings,
      completed_sources: 1,
      total_sources: 1,
      received_batches: 1,
      is_final: true,
    },
    {
      type: 'complete',
      keyword,
      resources: response.resources,
      warnings: response.warnings,
      completed_sources: 1,
      total_sources: 1,
      received_batches: 1,
      is_final: true,
      response,
    },
  ].map((event) => JSON.stringify(event)).join('\n') + '\n';
};

const hotRankingResponse = apiEnvelope({
  mode: 'trend',
  period: 'day',
  page: 1,
  page_size: 100,
  has_more: false,
  updated_at: '2026-06-07T00:00:00Z',
  source: 'tmdb',
  sections: [
    {
      category: 'movie',
      title: '电影',
      description: 'E2E 热门电影',
      items: [
        {
          id: 1,
          tmdb_id: 693134,
          media_type: 'movie',
          ranking_category: 'movie',
          title: '沙丘2',
          original_title: 'Dune: Part Two',
          overview: '保罗继续他的旅程。',
          poster_url: '',
          backdrop_url: '',
          vote_average: 8.3,
          vote_count: 12000,
          popularity: 980,
          release_date: '2024-03-01',
          genre_names: ['科幻', '冒险'],
          tmdb_url: 'https://www.themoviedb.org/movie/693134',
        },
      ],
    },
  ],
});

const pluginCatalogResponse = {
  version: 'e2e',
  items: [
    {
      name: 'pan666',
      priority: 1,
      status: 'active',
      plugin_type: 'builtin',
      is_enabled: true,
      description: 'E2E 插件目录项',
      version: '1.0.0',
      category: 'search',
      source_type: 'local',
      capabilities: ['resource.search'],
      tags: ['稳定'],
      is_local: true,
      installed: true,
      health: {
        is_healthy: true,
        checked_at: '2026-06-07T00:00:00Z',
      },
      resource: {
        source_label: '本地',
      },
    },
    {
      name: 'javdb',
      priority: 2,
      status: 'error',
      plugin_type: 'builtin',
      is_enabled: false,
      description: '停用且最近测试异常的 E2E 插件目录项',
      version: '1.0.0',
      category: 'search',
      source_type: 'local',
      capabilities: ['resource.search'],
      tags: ['异常'],
      is_local: true,
      installed: true,
      health: {
        is_healthy: false,
        checked_at: '2026-06-28T12:40:00Z',
        check_source: 'manual_test',
        last_error: '[javdb] 搜索请求 HTTP状态错误: 403',
      },
      resource: {
        source_label: '本地',
      },
    },
  ],
};

export async function mockPublicApis(page: Page) {
  await page.route('**/api/system-settings', async (route) => {
    await route.fulfill({ json: publicSettings });
  });
  await page.route('**/api/system-settings/announcement-enabled', async (route) => {
    await route.fulfill({ json: apiEnvelope({ enabled: false }) });
  });
  await page.route('**/api/announcements/active', async (route) => {
    await route.fulfill({ json: apiEnvelope([]) });
  });
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      json: apiEnvelope({
        status: 'ok',
        auth_enabled: true,
        plugins_enabled: true,
        plugin_count: 1,
        plugins: ['pan666'],
        channels_count: 0,
        channels: [],
      }),
    });
  });
  await page.route('**/api/hot?**', async (route) => {
    await route.fulfill({ json: hotRankingResponse });
  });
  await page.route('**/api/search/progressive', async (route) => {
    const body = route.request().postDataJSON() as { kw?: string } | undefined;
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson; charset=utf-8',
      body: createProgressiveSearchBody(body?.kw || '测试'),
    });
  });
  await page.route('**/api/search', async (route) => {
    const body = route.request().postDataJSON() as { kw?: string } | undefined;
    await route.fulfill({
      json: createSearchResponse(body?.kw || '测试'),
    });
  });
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      json: apiEnvelope({
        access_token: e2eUserToken,
        expires_at: 1_800_000_000,
        username: 'e2e-user',
      }),
    });
  });
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      json: apiEnvelope({
        access_token: e2eUserToken,
        expires_at: 1_800_000_000,
        refresh_token: 'e2e-refresh-token',
      }),
    });
  });
}

export async function mockAdminApis(page: Page) {
  await page.route('**/api/admin/plugin-center/catalog?**', async (route) => {
    await route.fulfill({ json: pluginCatalogResponse });
  });
  await page.route('**/api/admin/tags?scope=plugin', async (route) => {
    await route.fulfill({ json: { items: [] } });
  });
}

export async function signIn(page: Page, options: { admin?: boolean } = {}) {
  await page.addInitScript(({ isAdmin, userToken, adminToken }) => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          token: isAdmin ? adminToken : userToken,
          refreshToken: null,
          username: isAdmin ? 'admin' : 'e2e-user',
          isAuthenticated: true,
          isAdmin,
        },
        version: 0,
      }),
    );
  }, {
    isAdmin: Boolean(options.admin),
    userToken: e2eUserToken,
    adminToken: e2eAdminToken,
  });
}
