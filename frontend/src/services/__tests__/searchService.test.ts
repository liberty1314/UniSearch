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
      },
    });

    expect(url.startsWith('/search?')).toBe(true);
    expect(url).toContain('q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97');
    expect(url).toContain('include=4K%2C%E5%89%A7%E5%9C%BA%E7%89%88');
    expect(url).toContain('exclude=%E6%9E%AA%E7%89%88');
    expect(url).not.toContain('sourceTypes=');
    expect(url).not.toContain('mediaTypes=');
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

  it('ignores legacy advanced filter query fields when parsing URLs', () => {
    expect(
      SearchService.parseSearchUrl(
        '/?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97&include=4K&exclude=%E6%9E%AA%E7%89%88&mediaTypes=movie&capabilities=downloadable'
      )
    ).toEqual({
      keyword: '你的名字',
      filter: {
        include: ['4K'],
        exclude: ['枪版'],
      },
    });
  });
});
