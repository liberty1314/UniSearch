import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from '@/services/searchService';

const { postMock, getMock, refreshSingleFlightMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
  refreshSingleFlightMock: vi.fn(),
}));

// 渐进式搜索的认证状态可变快照，供 401 刷新链路测试控制
const authState = {
  token: null as string | null,
  rememberMe: false,
};

vi.mock('@/lib/api', () => ({
  apiClient: {
    post: postMock,
    get: getMock,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

vi.mock('@/lib/authRefreshManager', () => ({
  refreshAuthTokenSingleFlight: (...args: unknown[]) => refreshSingleFlightMock(...args),
}));

const buildSearchParams = () => ({
  keyword: '仙逆',
  source: 'all' as const,
  resultType: 'merge' as const,
  cloudTypes: [],
  channels: [],
  plugins: [],
  concurrency: 5,
  refresh: false,
  ext: {},
});

// 构造可分块读取的 NDJSON 响应体
const buildNdjsonResponse = (lines: unknown[], status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (lines[0] ? JSON.stringify(lines[0]) : ''),
  body: {
    getReader: () => {
      let index = 0;
      return {
        read: async () => {
          if (index < lines.length) {
            const value = new TextEncoder().encode(
              `${JSON.stringify(lines[index])}\n`,
            );
            index += 1;
            return { done: false, value };
          }
          return { done: true, value: undefined };
        },
      };
    },
  },
});

describe('SearchService', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    refreshSingleFlightMock.mockReset();
    authState.token = null;
    authState.rememberMe = false;
    SearchService.clearHealthCacheForTest();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards search API errors without dropping the status code', async () => {
    const apiError = {
      code: 401,
      message: '请先登录后再进行搜索',
    };
    postMock.mockRejectedValue(apiError);

    await expect(
      SearchService.search({
        keyword: '仙逆',
        source: 'all',
        resultType: 'merge',
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
      })
    ).rejects.toBe(apiError);
  });

  it('strips empty search request fields before submitting', async () => {
    postMock.mockResolvedValue({ resources: [], facets: {}, total: 0 });

    await SearchService.search({
      keyword: '仙逆',
      source: 'all',
      resultType: 'merge',
      cloudTypes: [],
      channels: [],
      plugins: [],
      concurrency: 5,
      refresh: false,
      ext: {},
    });

    expect(postMock).toHaveBeenCalledWith('/search', {
      kw: '仙逆',
      src: 'all',
      res: 'merge',
      conc: 5,
      refresh: false,
      ext: {},
    });
  });

  it('刷新扫码转存载荷时会透传当前资源定位信息', async () => {
    const refreshResponse = {
      resource_id: 'seedhub-scan-1',
      link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
      access_mode: 'scan_transfer',
      scan_transfer: {
        qr_code_base64: 'data:image/png;base64,new456',
        refreshable: true,
        refresh_key: 'seedhub:4259:quark:1',
      },
    };
    postMock.mockResolvedValue(refreshResponse);

    await expect(
      SearchService.refreshScanTransfer({
        resource_id: 'seedhub-scan-1',
        link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
        refresh_key: 'seedhub:4259:quark:1',
      }),
    ).resolves.toBe(refreshResponse);

    expect(postMock).toHaveBeenCalledWith('/resources/scan-transfer/refresh', {
      resource_id: 'seedhub-scan-1',
      link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
      refresh_key: 'seedhub:4259:quark:1',
    });
  });

  it('刷新扫码转存载荷时会透传取消信号', async () => {
    const refreshResponse = {
      resource_id: 'seedhub-scan-1',
      link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
      access_mode: 'scan_transfer',
    };
    const abortController = new AbortController();
    postMock.mockResolvedValue(refreshResponse);

    await expect(
      SearchService.refreshScanTransfer(
        {
          resource_id: 'seedhub-scan-1',
          link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
          refresh_key: 'seedhub:4259:quark:1',
        },
        { signal: abortController.signal },
      ),
    ).resolves.toBe(refreshResponse);

    expect(postMock).toHaveBeenCalledWith(
      '/resources/scan-transfer/refresh',
      {
        resource_id: 'seedhub-scan-1',
        link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
        refresh_key: 'seedhub:4259:quark:1',
      },
      { signal: abortController.signal },
    );
  });

  it('resolves an opaque resource candidate and preserves API errors', async () => {
    const payload = {
      resource_id: 'r_v1_resource',
      link_id: 'lnk_v1_link',
      resolve_token: 'rrt_v1_token',
    };
    const response = {
      resource_id: payload.resource_id,
      link_id: payload.link_id,
      resolution_status: 'resolved' as const,
      link: {
        id: payload.link_id,
        type: 'quark',
        url: 'https://pan.quark.cn/s/resolved',
        access_mode: 'direct_open' as const,
      },
    };
    const controller = new AbortController();
    postMock.mockResolvedValueOnce(response);

    await expect(
      SearchService.resolveResource(payload, { signal: controller.signal }),
    ).resolves.toBe(response);
    expect(postMock).toHaveBeenCalledWith(
      '/resources/resolve',
      payload,
      { signal: controller.signal },
    );

    const apiError = {
      response: { status: 410, data: { error_code: 'RESOURCE_INVALID' } },
      data: { error_code: 'RESOURCE_INVALID' },
    };
    postMock.mockRejectedValueOnce(apiError);
    await expect(SearchService.resolveResource(payload)).rejects.toBe(apiError);
    expect(apiError.response.status).toBe(410);
    expect(apiError.data.error_code).toBe('RESOURCE_INVALID');
  });

  it('round-trips advanced filters through the search URL codec', () => {
    const url = SearchService.buildSearchUrl({
      keyword: '你的名字',
      source: 'plugin',
      resultType: 'merge',
      cloudTypes: ['quark', 'baidu'],
      channels: ['影视'],
      plugins: ['pansearch'],
      refresh: true,
      filter: {
        include: ['4K', '剧场版'],
        exclude: ['枪版'],
        mediaTypes: ['movie', 'anime'],
      },
    });

    expect(url.startsWith('/search?')).toBe(true);
    expect(url).toContain('q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97');
    expect(url).toContain('include=4K%2C%E5%89%A7%E5%9C%BA%E7%89%88');
    expect(url).toContain('exclude=%E6%9E%AA%E7%89%88');
    expect(url).toContain('mediaTypes=movie%2Canime');
    expect(url).toContain('refresh=true');
    expect(url).not.toContain('targetTypes=');
    expect(url).not.toContain('capabilities=');
    expect(url).not.toContain('actionTypes=');

    expect(SearchService.parseSearchUrl(url)).toEqual({
      keyword: '你的名字',
      source: 'plugin',
      cloudTypes: ['quark', 'baidu'],
      channels: ['影视'],
      plugins: ['pansearch'],
      refresh: true,
      filter: {
        include: ['4K', '剧场版'],
        exclude: ['枪版'],
        mediaTypes: ['movie', 'anime'],
      },
    });
  });

  it('builds the empty search URL on the standalone search page path', () => {
    expect(
      SearchService.buildSearchUrl({
        keyword: '',
        source: 'all',
        resultType: 'merge',
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
      })
    ).toBe('/search');
  });

  it('为热门内容生成去重后的搜索动作', () => {
    const actions = SearchService.buildTrendingSearchActions({
      title: '沙丘 2',
      original_title: 'Dune: Part Two',
    });

    expect(actions).toEqual([
      {
        key: 'title',
        label: '搜片名',
        keyword: '沙丘 2',
        isPrimary: true,
      },
      {
        key: 'original_title',
        label: '搜原名',
        keyword: 'Dune: Part Two',
        isPrimary: false,
      },
      {
        key: 'title_4k',
        label: '搜 4K',
        keyword: '沙丘 2',
        isPrimary: false,
      },
    ]);
  });

  it('热门内容搜索动作会忽略与片名相同的原名', () => {
    const actions = SearchService.buildTrendingSearchActions({
      title: '奥本海默',
      original_title: '奥本海默',
    });

    expect(actions).toEqual([
      {
        key: 'title',
        label: '搜片名',
        keyword: '奥本海默',
        isPrimary: true,
      },
      {
        key: 'title_4k',
        label: '搜 4K',
        keyword: '奥本海默',
        isPrimary: false,
      },
    ]);
  });

  it('ignores legacy advanced filter query fields when parsing URLs', () => {
    expect(
      SearchService.parseSearchUrl(
        '/?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97&include=4K&exclude=%E6%9E%AA%E7%89%88&mediaTypes=movie&capabilities=downloadable&targetTypes=share'
      )
    ).toEqual({
      keyword: '你的名字',
      filter: {
        include: ['4K'],
        exclude: ['枪版'],
        mediaTypes: ['movie'],
      },
    });
  });

  it('coalesces concurrent health checks into one request', async () => {
    const healthResponse = {
      status: 'ok',
      plugins: ['pansearch'],
      channels: ['tg-a'],
    };
    getMock.mockResolvedValue(healthResponse);

    const [first, second] = await Promise.all([
      SearchService.getHealth(),
      SearchService.getHealth(),
    ]);

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(healthResponse);
    expect(second).toBe(healthResponse);
  });

  it('reuses the health response only within the short ttl window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T00:00:00.000Z'));
    getMock
      .mockResolvedValueOnce({ status: 'ok', plugins: ['first'], channels: [] })
      .mockResolvedValueOnce({ status: 'ok', plugins: ['second'], channels: [] });

    await expect(SearchService.getHealth()).resolves.toMatchObject({
      plugins: ['first'],
    });
    await expect(SearchService.getHealth()).resolves.toMatchObject({
      plugins: ['first'],
    });
    expect(getMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5001);

    await expect(SearchService.getHealth()).resolves.toMatchObject({
      plugins: ['second'],
    });
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('渐进式搜索解析 NDJSON 事件并透传外部取消信号', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const abortController = new AbortController();
    fetchMock.mockResolvedValue(
      buildNdjsonResponse([
        { type: 'started', completed_sources: 0, total_sources: 1, received_batches: 0 },
        { type: 'batch', resources: [], warnings: [], completed_sources: 1, total_sources: 1, received_batches: 1 },
        {
          type: 'complete',
          response: { total: 0, resources: [], facets: {}, warnings: [] },
        },
      ]),
    );

    const events: Array<{ type: string }> = [];
    const result = await SearchService.searchProgressive(buildSearchParams(), {
      signal: abortController.signal,
      onEvent: (event) => events.push({ type: event.type }),
    });

    expect(result.total).toBe(0);
    expect(events.map((event) => event.type)).toEqual([
      'started',
      'batch',
      'complete',
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/search/progressive',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('外部取消信号中止渐进式搜索流', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // 流读取挂起，直到收到取消信号才以 AbortError 拒绝
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: () =>
                new Promise((_resolve, reject) => {
                  init.signal.addEventListener('abort', () => {
                    reject(new DOMException('已中止', 'AbortError'));
                  });
                }),
            }),
          },
        }),
    );

    const controller = new AbortController();
    const pending = SearchService.searchProgressive(buildSearchParams(), {
      signal: controller.signal,
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    controller.abort();

    await expect(pending).rejects.toThrow();
  });

  it('渐进式搜索 401 时刷新令牌并重试一次', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    authState.token = 'expired-token';
    authState.rememberMe = true;
    refreshSingleFlightMock.mockResolvedValue({});
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
        body: null,
      })
      .mockResolvedValueOnce(
        buildNdjsonResponse([
          {
            type: 'complete',
            response: { total: 1, resources: [], facets: {}, warnings: [] },
          },
        ]),
      );

    await expect(
      SearchService.searchProgressive(buildSearchParams()),
    ).resolves.toMatchObject({ total: 1 });

    expect(refreshSingleFlightMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('渐进式搜索流空闲超过 30 秒后中止', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: () =>
                new Promise((_resolve, reject) => {
                  init.signal.addEventListener('abort', () => {
                    reject(new DOMException('已中止', 'AbortError'));
                  });
                }),
            }),
          },
        }),
    );

    const pending = SearchService.searchProgressive(buildSearchParams());
    const pendingExpectation = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(31000);
    await pendingExpectation;
  });
});
