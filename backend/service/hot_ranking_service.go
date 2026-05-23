package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"unisearch/model"
	"unisearch/util/cache"
)

type HotRankingService struct {
	tmdbService TMDBService
	cache       HotRankingCache
}

func NewHotRankingService(tmdbService TMDBService, rankingCache HotRankingCache) *HotRankingService {
	if rankingCache == nil {
		rankingCache = &hotRankingCache{}
	}
	return &HotRankingService{
		tmdbService: tmdbService,
		cache:       rankingCache,
	}
}

func NewHotRankingServiceWithRedis(redisCache *cache.RedisCache) *HotRankingService {
	return NewHotRankingService(NewTMDBService(), newHotRankingCache(redisCache))
}

func (s *HotRankingService) GetHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	if s == nil || s.tmdbService == nil {
		return model.HotRankingResponse{}, errors.New("热门榜单服务未初始化")
	}

	period = model.NormalizeHotRankingPeriod(string(period))
	category = model.NormalizeHotRankingCategory(string(category))

	var cached model.HotRankingResponse
	if s.cache != nil {
		hit, err := s.cache.Load(ctx, period, category, &cached)
		if err != nil {
			return model.HotRankingResponse{}, err
		}
		if hit {
			return cached, nil
		}
	}

	response, err := s.fetchHotRankings(ctx, period, category)
	if err != nil {
		return model.HotRankingResponse{}, normalizeTMDBServiceError(err)
	}

	if s.cache != nil {
		if err := s.cache.Store(ctx, period, category, response); err != nil {
			return model.HotRankingResponse{}, err
		}
	}

	return response, nil
}

func (s *HotRankingService) RefreshHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	if s == nil || s.tmdbService == nil {
		return model.HotRankingResponse{}, errors.New("热门榜单服务未初始化")
	}

	period = model.NormalizeHotRankingPeriod(string(period))
	category = model.NormalizeHotRankingCategory(string(category))

	response, err := s.fetchHotRankings(ctx, period, category)
	if err != nil {
		return model.HotRankingResponse{}, normalizeTMDBServiceError(err)
	}

	if s.cache != nil {
		if err := s.cache.Store(ctx, period, category, response); err != nil {
			return model.HotRankingResponse{}, err
		}
	}

	return response, nil
}

func (s *HotRankingService) fetchHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	switch category {
	case model.HotRankingCategoryTV:
		return s.fetchTVRankings(ctx, period)
	case model.HotRankingCategoryAnime:
		return s.fetchAnimeRankings(ctx, period)
	default:
		return s.fetchMovieRankings(ctx, period)
	}
}

func (s *HotRankingService) fetchMovieRankings(ctx context.Context, period model.HotRankingPeriod) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetMovieGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	var rawItems []TMDBMovieResult
	switch period {
	case model.HotRankingPeriodDay, model.HotRankingPeriodWeek:
		rawItems, err = s.tmdbService.GetTrendingMovies(ctx, string(period))
	default:
		rawItems, err = s.tmdbService.DiscoverMovies(ctx, buildMovieDiscoverParams(period))
	}
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapMovieResultToHotRankingItem(item, model.HotRankingCategoryMovie, genres))
	}

	return buildHotRankingResponse(period, model.HotRankingCategoryMovie, items), nil
}

func (s *HotRankingService) fetchTVRankings(ctx context.Context, period model.HotRankingPeriod) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	var rawItems []TMDBTVResult
	switch period {
	case model.HotRankingPeriodDay, model.HotRankingPeriodWeek:
		rawItems, err = s.tmdbService.GetTrendingTV(ctx, string(period))
	default:
		rawItems, err = s.tmdbService.DiscoverTV(ctx, buildTVDiscoverParams(period, nil))
	}
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapTVResultToHotRankingItem(item, model.HotRankingCategoryTV, genres))
	}

	return buildHotRankingResponse(period, model.HotRankingCategoryTV, items), nil
}

func (s *HotRankingService) fetchAnimeRankings(ctx context.Context, period model.HotRankingPeriod) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	var rawItems []TMDBTVResult
	switch period {
	case model.HotRankingPeriodDay, model.HotRankingPeriodWeek:
		rawItems, err = s.tmdbService.GetTrendingTV(ctx, string(period))
	default:
		rawItems, err = s.tmdbService.DiscoverTV(ctx, buildTVDiscoverParams(period, []int{16}))
	}
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		if !isAnimeTV(item) {
			continue
		}
		items = append(items, mapTVResultToHotRankingItem(item, model.HotRankingCategoryAnime, genres))
	}

	return buildHotRankingResponse(period, model.HotRankingCategoryAnime, items), nil
}

func buildMovieDiscoverParams(period model.HotRankingPeriod) TMDBDiscoverMovieParams {
	params := TMDBDiscoverMovieParams{
		SortBy:       "popularity.desc",
		VoteCountGTE: 50,
	}

	now := time.Now().UTC()
	switch period {
	case model.HotRankingPeriodYear:
		params.PrimaryReleaseYear = now.Year()
	default:
		start := now.AddDate(0, 0, -30)
		params.PrimaryReleaseGTE = start.Format("2006-01-02")
		params.PrimaryReleaseLTE = now.Format("2006-01-02")
	}
	return params
}

func buildTVDiscoverParams(period model.HotRankingPeriod, genres []int) TMDBDiscoverTVParams {
	params := TMDBDiscoverTVParams{
		SortBy:       "popularity.desc",
		VoteCountGTE: 50,
		WithGenres:   genres,
	}

	now := time.Now().UTC()
	switch period {
	case model.HotRankingPeriodYear:
		params.FirstAirDateYear = now.Year()
	default:
		start := now.AddDate(0, 0, -30)
		params.FirstAirDateGTE = start.Format("2006-01-02")
		params.FirstAirDateLTE = now.Format("2006-01-02")
	}
	return params
}

func buildHotRankingResponse(period model.HotRankingPeriod, category model.HotRankingCategory, items []model.HotRankingItem) model.HotRankingResponse {
	sectionTitle := map[model.HotRankingCategory]string{
		model.HotRankingCategoryMovie: "热门电影",
		model.HotRankingCategoryTV:    "热门电视剧",
		model.HotRankingCategoryAnime: "热门动漫",
	}[category]

	description := map[model.HotRankingCategory]string{
		model.HotRankingCategoryMovie: "基于 TMDB 数据整理的电影热门内容。",
		model.HotRankingCategoryTV:    "基于 TMDB 数据整理的电视剧热门内容。",
		model.HotRankingCategoryAnime: "基于 TMDB 数据整理的动漫热门内容。",
	}[category]

	var spotlight *model.HotRankingItem
	if len(items) > 0 {
		highlight := items[0]
		spotlight = &highlight
	}

	note := "数据来自 TMDB 热门榜。"
	if period == model.HotRankingPeriodDay || period == model.HotRankingPeriodWeek {
		note = "每日、每周使用 TMDB 趋势口径。"
	} else {
		note = "每月、每年使用 TMDB 热门口径（discover + popularity）。"
	}

	return model.HotRankingResponse{
		Period:    period,
		UpdatedAt: time.Now().UTC(),
		Source:    "tmdb",
		Note:      note,
		Sections: []model.HotRankingSection{
			{
				Category:    category,
				Title:       sectionTitle,
				Description: description,
				Spotlight:   spotlight,
				Items:       limitHotRankingItems(items, 12),
			},
		},
	}
}

func limitHotRankingItems(items []model.HotRankingItem, limit int) []model.HotRankingItem {
	if len(items) <= limit {
		return items
	}
	return items[:limit]
}

func normalizeTMDBServiceError(err error) error {
	var apiErr *tmdbAPIError
	if !errors.As(err, &apiErr) {
		return err
	}

	switch apiErr.StatusCode {
	case http.StatusTooManyRequests:
		return fmt.Errorf("榜单服务繁忙，请稍后重试")
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("榜单服务配置异常，请联系管理员")
	default:
		return err
	}
}
