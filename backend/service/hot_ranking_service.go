package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
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

func (s *HotRankingService) GetHotRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	if s == nil || s.tmdbService == nil {
		return model.HotRankingResponse{}, errors.New("热门榜单服务未初始化")
	}

	query = normalizeHotRankingQuery(query)
	if err := validateHotRankingQuery(query); err != nil {
		return model.HotRankingResponse{}, err
	}

	var cached model.HotRankingResponse
	cacheQuery, shouldUseCache := resolveHotRankingCacheQuery(query)
	if s.cache != nil && shouldUseCache {
		hit, err := s.cache.Load(ctx, cacheQuery, &cached)
		if err != nil {
			return model.HotRankingResponse{}, err
		}
		if hit {
			return adaptHotRankingResponsePageSize(cached, query.PageSize), nil
		}
	}

	response, err := s.fetchHotRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, normalizeTMDBServiceError(err)
	}

	if s.cache != nil && shouldUseCache {
		cacheValue := response
		if cacheQuery.PageSize != response.PageSize {
			cacheValue = adaptHotRankingResponsePageSize(response, cacheQuery.PageSize)
		}
		if err := s.cache.Store(ctx, cacheQuery, cacheValue); err != nil {
			return model.HotRankingResponse{}, err
		}
	}

	return response, nil
}

func (s *HotRankingService) RefreshHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	if s == nil || s.tmdbService == nil {
		return model.HotRankingResponse{}, errors.New("热门榜单服务未初始化")
	}

	query := normalizeHotRankingQuery(model.HotRankingQuery{
		Mode:     resolveDefaultModeByPeriod(period),
		Period:   period,
		Category: category,
	})

	response, err := s.fetchHotRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, normalizeTMDBServiceError(err)
	}

	if s.cache != nil {
		if err := s.cache.Store(ctx, query, response); err != nil {
			return model.HotRankingResponse{}, err
		}
	}

	return response, nil
}

func (s *HotRankingService) fetchHotRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	if query.Mode == model.HotRankingModeTrend {
		return s.fetchTrendRankings(ctx, query)
	}
	return s.fetchPopularRankings(ctx, query)
}

func (s *HotRankingService) fetchTrendRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	switch query.Category {
	case model.HotRankingCategoryAll:
		return s.fetchAggregateTrendRankings(ctx, query)
	case model.HotRankingCategoryTV:
		return s.fetchTrendTVRankings(ctx, query)
	case model.HotRankingCategoryAnime:
		return s.fetchTrendAnimeRankings(ctx, query)
	default:
		return s.fetchTrendMovieRankings(ctx, query)
	}
}

func (s *HotRankingService) fetchPopularRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	switch query.Category {
	case model.HotRankingCategoryAll:
		return s.fetchAggregatePopularRankings(ctx, query)
	case model.HotRankingCategoryTV:
		return s.fetchPopularTVRankings(ctx, query)
	case model.HotRankingCategoryAnime:
		return s.fetchPopularAnimeRankings(ctx, query)
	default:
		return s.fetchPopularMovieRankings(ctx, query)
	}
}

func (s *HotRankingService) fetchAggregateTrendRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	movie, err := s.fetchTrendMovieRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	tv, err := s.fetchTrendTVRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	anime, err := s.fetchTrendAnimeRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	sections := make([]model.HotRankingSection, 0, 3)
	if len(movie.Sections) > 0 {
		sections = append(sections, movie.Sections[0])
	}
	if len(tv.Sections) > 0 {
		sections = append(sections, tv.Sections[0])
	}
	if len(anime.Sections) > 0 {
		sections = append(sections, anime.Sections[0])
	}

	return buildAggregateHotRankingResponse(query, sections), nil
}

func (s *HotRankingService) fetchAggregatePopularRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	movie, err := s.fetchPopularMovieRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	tv, err := s.fetchPopularTVRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	anime, err := s.fetchPopularAnimeRankings(ctx, query)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	sections := make([]model.HotRankingSection, 0, 3)
	if len(movie.Sections) > 0 {
		sections = append(sections, movie.Sections[0])
	}
	if len(tv.Sections) > 0 {
		sections = append(sections, tv.Sections[0])
	}
	if len(anime.Sections) > 0 {
		sections = append(sections, anime.Sections[0])
	}

	return buildAggregateHotRankingResponse(query, sections), nil
}

func (s *HotRankingService) fetchTrendMovieRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	if shouldUseDiscoverForTrend(query) {
		return s.fetchPopularMovieRankings(ctx, query)
	}

	genres, err := s.tmdbService.GetMovieGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.tmdbService.GetTrendingMovies(ctx, string(query.Period))
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapMovieResultToHotRankingItem(item, model.HotRankingCategoryMovie, genres))
	}

	return buildHotRankingResponse(query, model.HotRankingCategoryMovie, items), nil
}

func (s *HotRankingService) fetchTrendTVRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	if shouldUseDiscoverForTrend(query) {
		return s.fetchPopularTVRankings(ctx, query)
	}

	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.tmdbService.GetTrendingTV(ctx, string(query.Period))
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapTVResultToHotRankingItem(item, model.HotRankingCategoryTV, genres))
	}

	return buildHotRankingResponse(query, model.HotRankingCategoryTV, items), nil
}

func (s *HotRankingService) fetchTrendAnimeRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	if shouldUseDiscoverForTrend(query) {
		return s.fetchPopularAnimeRankings(ctx, query)
	}

	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.tmdbService.GetTrendingTV(ctx, string(query.Period))
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

	return buildHotRankingResponse(query, model.HotRankingCategoryAnime, items), nil
}

func (s *HotRankingService) fetchPopularMovieRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetMovieGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.fetchDiscoverMoviePages(ctx, buildMovieDiscoverParams(query))
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapMovieResultToHotRankingItem(item, model.HotRankingCategoryMovie, genres))
	}

	return buildHotRankingResponse(query, model.HotRankingCategoryMovie, items), nil
}

func (s *HotRankingService) fetchPopularTVRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.fetchDiscoverTVPages(ctx, buildTVDiscoverParams(query, nil))
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	items := make([]model.HotRankingItem, 0, len(rawItems))
	for _, item := range rawItems {
		items = append(items, mapTVResultToHotRankingItem(item, model.HotRankingCategoryTV, genres))
	}

	return buildHotRankingResponse(query, model.HotRankingCategoryTV, items), nil
}

func (s *HotRankingService) fetchPopularAnimeRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	genres, err := s.tmdbService.GetTVGenres(ctx)
	if err != nil {
		return model.HotRankingResponse{}, err
	}

	rawItems, err := s.fetchDiscoverTVPages(ctx, buildTVDiscoverParams(query, []int{16}))
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

	return buildHotRankingResponse(query, model.HotRankingCategoryAnime, items), nil
}

func (s *HotRankingService) fetchDiscoverMoviePages(ctx context.Context, params TMDBDiscoverMovieParams) ([]TMDBMovieResult, error) {
	pageCount := pageCountForSize(params.Page, 100)
	items := make([]TMDBMovieResult, 0, 100)
	basePage := resolveBasePage(params.Page, 100)

	for offset := 0; offset < pageCount; offset++ {
		pageParams := params
		pageParams.Page = basePage + offset
		pageItems, err := s.tmdbService.DiscoverMovies(ctx, pageParams)
		if err != nil {
			return nil, err
		}
		items = append(items, pageItems...)
		if len(pageItems) == 0 {
			break
		}
	}

	return items, nil
}

func (s *HotRankingService) fetchDiscoverTVPages(ctx context.Context, params TMDBDiscoverTVParams) ([]TMDBTVResult, error) {
	pageCount := pageCountForSize(params.Page, 100)
	items := make([]TMDBTVResult, 0, 100)
	basePage := resolveBasePage(params.Page, 100)

	for offset := 0; offset < pageCount; offset++ {
		pageParams := params
		pageParams.Page = basePage + offset
		pageItems, err := s.tmdbService.DiscoverTV(ctx, pageParams)
		if err != nil {
			return nil, err
		}
		items = append(items, pageItems...)
		if len(pageItems) == 0 {
			break
		}
	}

	return items, nil
}

func buildMovieDiscoverParams(query model.HotRankingQuery) TMDBDiscoverMovieParams {
	params := TMDBDiscoverMovieParams{
		SortBy:       resolveDiscoverSortBy(query),
		VoteCountGTE: 50,
		Page:         resolveBasePage(query.Page, query.PageSize),
	}

	switch query.Period {
	case model.HotRankingPeriodDay:
		params.PrimaryReleaseLTE = query.Date
	case model.HotRankingPeriodWeek:
		start, end := resolveWeekRange(query.WeekStart)
		params.PrimaryReleaseGTE = start
		params.PrimaryReleaseLTE = end
	case model.HotRankingPeriodMonth:
		start, end := resolveMonthRange(query.Month)
		params.PrimaryReleaseGTE = start
		params.PrimaryReleaseLTE = end
	case model.HotRankingPeriodYear:
		params.PrimaryReleaseYear = resolveYear(query.Year)
	}
	return params
}

func buildTVDiscoverParams(query model.HotRankingQuery, genres []int) TMDBDiscoverTVParams {
	params := TMDBDiscoverTVParams{
		SortBy:       resolveDiscoverSortBy(query),
		VoteCountGTE: 50,
		WithGenres:   genres,
		Page:         resolveBasePage(query.Page, query.PageSize),
	}

	switch query.Period {
	case model.HotRankingPeriodDay:
		params.FirstAirDateLTE = query.Date
	case model.HotRankingPeriodWeek:
		start, end := resolveWeekRange(query.WeekStart)
		params.FirstAirDateGTE = start
		params.FirstAirDateLTE = end
	case model.HotRankingPeriodMonth:
		start, end := resolveMonthRange(query.Month)
		params.FirstAirDateGTE = start
		params.FirstAirDateLTE = end
	case model.HotRankingPeriodYear:
		params.FirstAirDateYear = resolveYear(query.Year)
	}
	return params
}

func resolveDiscoverSortBy(query model.HotRankingQuery) string {
	if query.SortBy == "" {
		return string(model.HotRankingSortByPopularity)
	}
	return string(query.SortBy)
}

func shouldUseDiscoverForTrend(query model.HotRankingQuery) bool {
	return query.Mode == model.HotRankingModeTrend && query.SortBy != model.HotRankingSortByPopularity
}

func resolveHotRankingSortLabel(sortBy model.HotRankingSortBy) string {
	switch sortBy {
	case model.HotRankingSortByReleaseDate:
		return "时间"
	case model.HotRankingSortByVoteAverage:
		return "评分"
	default:
		return "热度"
	}
}

func buildHotRankingResponse(query model.HotRankingQuery, category model.HotRankingCategory, items []model.HotRankingItem) model.HotRankingResponse {
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
	if query.Mode == model.HotRankingModeTrend {
		if shouldUseDiscoverForTrend(query) {
			note = fmt.Sprintf("当前展示趋势时间范围内按%s排序的热门榜单。", resolveHotRankingSortLabel(query.SortBy))
		} else {
			note = "当前展示每日或每周趋势榜单。"
		}
	} else {
		note = fmt.Sprintf("当前展示按%s排序的热门榜单。", resolveHotRankingSortLabel(query.SortBy))
	}

	return model.HotRankingResponse{
		Mode:      query.Mode,
		Period:    query.Period,
		TimeKey:   resolveTimeKey(query),
		TimeLabel: resolveTimeLabel(query),
		Page:      query.Page,
		PageSize:  query.PageSize,
		HasMore:   len(items) >= query.PageSize,
		NextPage:  query.Page + 1,
		UpdatedAt: time.Now().UTC(),
		Source:    "tmdb",
		Note:      note,
		Sections: []model.HotRankingSection{
			{
				Category:    category,
				Title:       sectionTitle,
				Description: description,
				Spotlight:   spotlight,
				Items:       limitHotRankingItems(items, query.PageSize),
			},
		},
	}
}

func buildAggregateHotRankingResponse(query model.HotRankingQuery, sections []model.HotRankingSection) model.HotRankingResponse {
	note := "数据来自 TMDB 热门榜。"
	if query.Mode == model.HotRankingModeTrend {
		if shouldUseDiscoverForTrend(query) {
			note = fmt.Sprintf("当前展示趋势时间范围内按%s排序的热门榜单。", resolveHotRankingSortLabel(query.SortBy))
		} else {
			note = "当前展示每日或每周趋势榜单。"
		}
	} else {
		note = fmt.Sprintf("当前展示按%s排序的热门榜单。", resolveHotRankingSortLabel(query.SortBy))
	}

	return model.HotRankingResponse{
		Mode:      query.Mode,
		Period:    query.Period,
		TimeKey:   resolveTimeKey(query),
		TimeLabel: resolveTimeLabel(query),
		Page:      query.Page,
		PageSize:  query.PageSize,
		HasMore:   hasMoreInSections(sections, query.PageSize),
		NextPage:  query.Page + 1,
		UpdatedAt: time.Now().UTC(),
		Source:    "tmdb",
		Note:      note,
		Sections:  sections,
	}
}

func limitHotRankingItems(items []model.HotRankingItem, limit int) []model.HotRankingItem {
	if len(items) <= limit {
		return items
	}
	return items[:limit]
}

func normalizeHotRankingQuery(query model.HotRankingQuery) model.HotRankingQuery {
	query.Mode = model.NormalizeHotRankingMode(string(query.Mode))
	query.Period = model.NormalizeHotRankingPeriod(string(query.Period))
	query.Category = model.NormalizeHotRankingCategory(string(query.Category))
	query.SortBy = model.NormalizeHotRankingSortBy(string(query.SortBy))
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 {
		query.PageSize = 100
	}
	if query.PageSize > 100 {
		query.PageSize = 100
	}

	now := time.Now().UTC()
	if query.Mode == model.HotRankingModePopular || shouldUseDiscoverForTrend(query) {
		switch query.Period {
		case model.HotRankingPeriodDay:
			if strings.TrimSpace(query.Date) == "" {
				query.Date = now.Format("2006-01-02")
			}
		case model.HotRankingPeriodWeek:
			if strings.TrimSpace(query.WeekStart) == "" {
				offset := (int(now.Weekday()) + 6) % 7
				query.WeekStart = now.AddDate(0, 0, -offset).Format("2006-01-02")
			}
		case model.HotRankingPeriodMonth:
			if strings.TrimSpace(query.Month) == "" {
				query.Month = now.Format("2006-01")
			}
		case model.HotRankingPeriodYear:
			if strings.TrimSpace(query.Year) == "" {
				query.Year = fmt.Sprintf("%d", now.Year())
			}
		}
	}

	return query
}

func validateHotRankingQuery(query model.HotRankingQuery) error {
	return model.ValidateHotRankingQuery(query)
}

func resolveHotRankingCacheQuery(query model.HotRankingQuery) (model.HotRankingQuery, bool) {
	if query.Page != 1 {
		return query, false
	}

	cacheQuery := query
	if cacheQuery.PageSize <= 0 {
		cacheQuery.PageSize = 100
	}
	if cacheQuery.PageSize < 100 {
		cacheQuery.PageSize = 100
	}

	return cacheQuery, cacheQuery.PageSize == 100
}

func adaptHotRankingResponsePageSize(response model.HotRankingResponse, pageSize int) model.HotRankingResponse {
	if pageSize <= 0 || response.PageSize == pageSize {
		return response
	}

	adapted := response
	adapted.PageSize = pageSize
	adapted.HasMore = false
	if adapted.NextPage > 0 {
		adapted.NextPage = adapted.Page + 1
	}

	adapted.Sections = make([]model.HotRankingSection, 0, len(response.Sections))
	for _, section := range response.Sections {
		nextSection := section
		nextSection.Items = limitHotRankingItems(section.Items, pageSize)
		if len(nextSection.Items) > 0 {
			adapted.HasMore = true
		}
		adapted.Sections = append(adapted.Sections, nextSection)
	}

	return adapted
}

func resolveDefaultModeByPeriod(period model.HotRankingPeriod) model.HotRankingMode {
	if period == model.HotRankingPeriodMonth || period == model.HotRankingPeriodYear {
		return model.HotRankingModePopular
	}
	return model.HotRankingModeTrend
}

func resolveBasePage(page int, pageSize int) int {
	if page <= 1 {
		return 1
	}
	return ((page - 1) * pageSize / 20) + 1
}

func pageCountForSize(page int, pageSize int) int {
	count := pageSize / 20
	if pageSize%20 != 0 {
		count++
	}
	if count <= 0 {
		return 1
	}
	return count
}

func resolveWeekRange(weekStart string) (string, string) {
	start, err := time.Parse("2006-01-02", weekStart)
	if err != nil {
		now := time.Now().UTC()
		offset := (int(now.Weekday()) + 6) % 7
		start = now.AddDate(0, 0, -offset)
	}
	end := start.AddDate(0, 0, 6)
	return start.Format("2006-01-02"), end.Format("2006-01-02")
}

func resolveMonthRange(monthValue string) (string, string) {
	parsed, err := time.Parse("2006-01", monthValue)
	if err != nil {
		parsed = time.Now().UTC()
	}
	start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1)
	return start.Format("2006-01-02"), end.Format("2006-01-02")
}

func resolveYear(yearValue string) int {
	if yearValue == "" {
		return time.Now().UTC().Year()
	}
	parsed, err := time.Parse("2006", yearValue)
	if err != nil {
		return time.Now().UTC().Year()
	}
	return parsed.Year()
}

func resolveTimeKey(query model.HotRankingQuery) string {
	switch query.Period {
	case model.HotRankingPeriodDay:
		return query.Date
	case model.HotRankingPeriodWeek:
		return query.WeekStart
	case model.HotRankingPeriodMonth:
		return query.Month
	case model.HotRankingPeriodYear:
		return query.Year
	default:
		return ""
	}
}

func resolveTimeLabel(query model.HotRankingQuery) string {
	switch query.Period {
	case model.HotRankingPeriodDay:
		return query.Date
	case model.HotRankingPeriodWeek:
		return fmt.Sprintf("%s 所在周", query.WeekStart)
	case model.HotRankingPeriodMonth:
		return query.Month
	case model.HotRankingPeriodYear:
		return query.Year
	default:
		return ""
	}
}

func hasMoreInSections(sections []model.HotRankingSection, pageSize int) bool {
	for _, section := range sections {
		if len(section.Items) >= pageSize {
			return true
		}
	}
	return false
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
