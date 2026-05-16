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
});
