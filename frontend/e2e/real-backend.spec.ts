import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface RealResourceLink {
  id?: string;
  type?: string;
  url?: string;
  access_mode?: string;
  scan_transfer?: Record<string, unknown>;
  resolution?: {
    status?: string;
    token?: string;
    expires_at?: string;
  };
}

interface RealResource {
  id: string;
  title: string;
  source?: {
    id?: string;
    plugin_id?: string;
  };
  links?: RealResourceLink[];
}

interface RealSearchResponse {
  total?: number;
  resources?: RealResource[];
  warnings?: unknown[];
}

const apiBaseURL = process.env.UNISEARCH_API_BASE_URL || 'http://127.0.0.1:8888';
const keyword = process.env.UNISEARCH_REAL_E2E_KEYWORD || '沧元图';
const username = `codexqa_e2e_${Date.now().toString(36)}`;
const password = `CodexQA${Date.now().toString(36)}x9`;
const dirname = path.dirname(fileURLToPath(import.meta.url));
const cleanupScript = path.resolve(dirname, '../../scripts/tests/cleanup-test-data.sh');
const forbiddenPublicTerms = [
  'sidhub.cc',
  'seedhub.cc',
  '/link_start/',
  'original_link_url',
  'sid_hub_detail_url',
  'source_page_url',
];
const supportedResolveErrors = new Set([
  'RESOURCE_INVALID',
  'RESOURCE_RESOLVE_TOKEN_EXPIRED',
  'RESOURCE_UPSTREAM_PARSE_FAILED',
  'RESOURCE_RESOLVER_UNAVAILABLE',
  'RESOURCE_RESOLVE_TIMEOUT',
  'RESOURCE_RESOLVE_RATE_LIMITED',
  'RESOURCE_RESOLVE_CONCURRENCY_LIMITED',
  'RESOURCE_RESOLVE_REQUEST_CANCELED',
]);

let accessToken = '';

test.describe.configure({ timeout: 120_000 });

const unwrapSearchResponse = (body: string): RealSearchResponse => {
  const trimmed = body.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const payload = JSON.parse(trimmed) as {
      data?: RealSearchResponse;
      response?: RealSearchResponse;
    } & RealSearchResponse;
    return payload.data || payload.response || payload;
  } catch {
    const events = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { type?: string; response?: RealSearchResponse });
    return events.findLast((event) => event.type === 'complete')?.response || {};
  }
};

const readAPIErrorCode = async (response: APIResponse): Promise<string> => {
  const body = await response.json().catch(() => ({})) as {
    error_code?: string;
    code?: string;
    data?: { error_code?: string; code?: string };
  };
  return body.error_code || body.data?.error_code || body.code || body.data?.code || '';
};

const installLoginState = async (page: Page) => {
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
};

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

test('真实后端强制搜索与点击解析保持不透明合同', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  await installLoginState(page);

  const searchResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && (url.pathname === '/api/search' || url.pathname === '/api/search/progressive')
      && response.status() === 200;
  });

  await page.goto(`/search?q=${encodeURIComponent(keyword)}&src=all&refresh=true`);
  const searchResponse = await searchResponsePromise;
  const searchBody = await searchResponse.text();
  const lowerSearchBody = searchBody.toLowerCase();
  for (const forbidden of forbiddenPublicTerms) {
    expect(lowerSearchBody, `搜索响应泄露 ${forbidden}`).not.toContain(forbidden);
  }

  const searchPayload = unwrapSearchResponse(searchBody);
  const resources = searchPayload.resources || [];
  const sourceCounts = resources.reduce<Record<string, number>>((counts, resource) => {
    const sourceId = resource.source?.id || resource.source?.plugin_id || 'unknown';
    counts[sourceId] = (counts[sourceId] || 0) + 1;
    return counts;
  }, {});
  const deferredCandidates = resources.flatMap((resource) =>
    (resource.links || [])
      .filter((link) => link.resolution?.status === 'deferred')
      .map((link) => ({ resource, link })),
  );

  for (const candidate of deferredCandidates) {
    expect(candidate.link.id, 'deferred link 缺少 id').toBeTruthy();
    expect(candidate.link.resolution?.token, 'deferred link 缺少 token').toBeTruthy();
    expect(candidate.link.resolution?.expires_at, 'deferred link 缺少 expires_at').toBeTruthy();
    expect(candidate.link).not.toHaveProperty('url');
  }

  const resultOrWarning = page
    .getByTestId('search-results-toolbar')
    .or(page.getByText(/部分来源异常|暂无结果|个结果/))
    .first();
  await expect(resultOrWarning).toBeVisible({ timeout: 30_000 });

  let resolverStatus: number | null = null;
  let resolverOutcome = 'skipped_no_deferred_candidate';
  if (deferredCandidates.length > 0) {
    const target = deferredCandidates[0];
    const targetCard = page.locator(
      `[data-resource-id="${target.resource.id.replaceAll('"', '\\"')}"]`,
    );
    for (let attempt = 0; attempt < 5 && await targetCard.count() === 0; attempt += 1) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
    }
    await expect(targetCard, `未在结果列表找到 deferred 资源 ${target.resource.id}`).toBeVisible();

    const resolveResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/resources/resolve'
      && response.request().method() === 'POST',
    );
    await targetCard.click();
    const resolveResponse = await resolveResponsePromise;
    resolverStatus = resolveResponse.status();
    const resolveRequest = resolveResponse.request().postDataJSON() as Record<string, unknown>;
    expect(resolveRequest).toEqual({
      resource_id: target.resource.id,
      link_id: target.link.id,
      resolve_token: target.link.resolution?.token,
    });
    expect(JSON.stringify(resolveRequest)).not.toMatch(/url/i);

    const resolveBody = await resolveResponse.text();
    const lowerResolveBody = resolveBody.toLowerCase();
    for (const forbidden of forbiddenPublicTerms) {
      expect(lowerResolveBody, `resolver 响应泄露 ${forbidden}`).not.toContain(forbidden);
    }

    if (resolveResponse.ok()) {
      const payload = JSON.parse(resolveBody) as {
        data?: { link?: RealResourceLink };
        link?: RealResourceLink;
      };
      const link = payload.data?.link || payload.link;
      expect(link, 'resolver 成功响应缺少 link').toBeTruthy();
      const hasActionableTarget = Boolean(link?.url)
        || Boolean(link?.scan_transfer && Object.keys(link.scan_transfer).length > 0);
      expect(hasActionableTarget, 'resolver 成功响应没有可操作目标').toBe(true);
      resolverOutcome = 'success';
    } else {
      const errorCode = await readAPIErrorCode(resolveResponse);
      expect(
        supportedResolveErrors.has(errorCode),
        `不受支持的 resolver error: ${errorCode}`,
      ).toBe(true);
      resolverOutcome = errorCode;
    }
  }

  console.info(`UNISEARCH_REAL_SMOKE ${JSON.stringify({
    keyword,
    total: searchPayload.total ?? resources.length,
    resources: resources.length,
    source_counts: sourceCounts,
    deferred_links: deferredCandidates.length,
    resolver_status: resolverStatus,
    resolver_outcome: resolverOutcome,
  })}`);
  expect(consoleErrors).toEqual([]);
});
