import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchService } from '@/services/searchService';

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    post: postMock,
    get: getMock,
  },
}));

describe('SearchService', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    SearchService.clearHealthCacheForTest();
    vi.useRealTimers();
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

  it('round-trips advanced filters through the search URL codec', () => {
    const url = SearchService.buildSearchUrl({
      keyword: '你的名字',
      source: 'plugin',
      resultType: 'merge',
      cloudTypes: ['quark', 'baidu'],
      channels: ['影视'],
      plugins: ['pansearch'],
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
    expect(url).not.toContain('targetTypes=');
    expect(url).not.toContain('capabilities=');
    expect(url).not.toContain('actionTypes=');

    expect(SearchService.parseSearchUrl(url)).toEqual({
      keyword: '你的名字',
      source: 'plugin',
      cloudTypes: ['quark', 'baidu'],
      channels: ['影视'],
      plugins: ['pansearch'],
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
        keyword: '沙丘 2 4K',
        isPrimary: false,
      },
      {
        key: 'title_collection',
        label: '搜合集',
        keyword: '沙丘 2 合集',
        isPrimary: false,
      },
    ]);
  });

  it('热门内容搜索动作会忽略与片名相同的原名', () => {
    const actions = SearchService.buildTrendingSearchActions({
      title: '奥本海默',
      original_title: '奥本海默',
    });

    expect(actions.map((action) => action.keyword)).toEqual([
      '奥本海默',
      '奥本海默 4K',
      '奥本海默 合集',
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
});
