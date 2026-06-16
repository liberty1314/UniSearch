package service

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"unisearch/model"
)

type HotRankingRefreshService interface {
	GetHotRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error)
}

type HotRankingPreloaderConfig struct {
	Enabled        bool
	DailyTime      string
	Limit          int
	Timeout        time.Duration
	Concurrency    int
	Location       *time.Location
	ResultHandler  func(HotRankingPreloadResult)
	ConfigResolver func() HotRankingPreloaderConfig
}

type HotRankingPreloadError struct {
	Mode     model.HotRankingMode     `json:"mode"`
	Period   model.HotRankingPeriod   `json:"period"`
	Category model.HotRankingCategory `json:"category"`
	SortBy   model.HotRankingSortBy   `json:"sort_by"`
	Err      error                    `json:"-"`
}

type HotRankingPreloadResult struct {
	Total   int                      `json:"total"`
	Success int                      `json:"success"`
	Failed  int                      `json:"failed"`
	Errors  []HotRankingPreloadError `json:"errors"`
}

type HotRankingPreloader struct {
	refreshService HotRankingRefreshService
	cache          HotRankingCache
	config         HotRankingPreloaderConfig
}

var hotRankingTrendPreloadPeriods = []model.HotRankingPeriod{
	model.HotRankingPeriodDay,
	model.HotRankingPeriodWeek,
}

var hotRankingPopularPreloadPeriods = []model.HotRankingPeriod{
	model.HotRankingPeriodDay,
	model.HotRankingPeriodWeek,
	model.HotRankingPeriodMonth,
	model.HotRankingPeriodYear,
}

var hotRankingPreloadCategories = []model.HotRankingCategory{
	model.HotRankingCategoryAll,
	model.HotRankingCategoryMovie,
	model.HotRankingCategoryTV,
	model.HotRankingCategoryAnime,
}

func NewHotRankingPreloader(refreshService HotRankingRefreshService, cfg HotRankingPreloaderConfig) *HotRankingPreloader {
	return &HotRankingPreloader{
		refreshService: refreshService,
		config:         normalizeHotRankingPreloaderConfig(cfg),
	}
}

func NewHotRankingPreloaderWithCache(refreshService HotRankingRefreshService, rankingCache HotRankingCache, cfg HotRankingPreloaderConfig) *HotRankingPreloader {
	return &HotRankingPreloader{
		refreshService: refreshService,
		cache:          rankingCache,
		config:         normalizeHotRankingPreloaderConfig(cfg),
	}
}

func (p *HotRankingPreloader) WarmAll(ctx context.Context) HotRankingPreloadResult {
	currentConfig := p.currentConfig()
	tasks := buildHotRankingPreloadTasks(currentConfig.Limit)
	result := HotRankingPreloadResult{Total: len(tasks)}
	if p == nil || !currentConfig.Enabled || p.refreshService == nil {
		return result
	}

	if p.cache != nil {
		_ = p.cache.ClearByPrefix(ctx, "hot-ranking:v3")
	}

	taskCh := make(chan model.HotRankingQuery)
	resultCh := make(chan HotRankingPreloadError, result.Total)
	var workers sync.WaitGroup
	var collector sync.WaitGroup
	var mu sync.Mutex

	collector.Add(1)
	go func() {
		defer collector.Done()
		for item := range resultCh {
			mu.Lock()
			if item.Err != nil {
				result.Failed++
				result.Errors = append(result.Errors, item)
			} else {
				result.Success++
			}
			mu.Unlock()
		}
	}()

	for i := 0; i < currentConfig.Concurrency; i++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for query := range taskCh {
				taskCtx := ctx
				cancel := func() {}
				if currentConfig.Timeout > 0 {
					taskCtx, cancel = context.WithTimeout(ctx, currentConfig.Timeout)
				}

				_, err := p.refreshService.GetHotRankings(taskCtx, query)
				cancel()
				resultCh <- HotRankingPreloadError{
					Mode:     query.Mode,
					Period:   query.Period,
					Category: query.Category,
					SortBy:   query.SortBy,
					Err:      err,
				}
			}
		}()
	}

	for _, task := range tasks {
		select {
		case <-ctx.Done():
			close(taskCh)
			workers.Wait()
			close(resultCh)
			collector.Wait()
			return result
		case taskCh <- task:
		}
	}

	close(taskCh)
	workers.Wait()
	close(resultCh)
	collector.Wait()
	return result
}

func (p *HotRankingPreloader) Start(ctx context.Context) {
	if p == nil || p.refreshService == nil {
		return
	}

	go func() {
		for {
			currentConfig := p.currentConfig()
			if !currentConfig.Enabled {
				timer := time.NewTimer(time.Minute)
				select {
				case <-ctx.Done():
					if !timer.Stop() {
						select {
						case <-timer.C:
						default:
						}
					}
					return
				case <-timer.C:
					continue
				}
			}

			nextRun, err := p.NextRun(time.Now().In(currentConfig.Location))
			if err != nil {
				log.Printf("热门榜单预热器调度失败: %v", err)
				return
			}

			wait := time.Until(nextRun)
			if wait < 0 {
				wait = 0
			}

			timer := time.NewTimer(wait)
			select {
			case <-ctx.Done():
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				return
			case <-timer.C:
			}

			result := p.WarmAll(ctx)
			if currentConfig.ResultHandler != nil {
				currentConfig.ResultHandler(result)
			}
			p.logResult("每日热门榜单预热完成", result)
		}
	}()
}

func (p *HotRankingPreloader) NextRun(now time.Time) (time.Time, error) {
	if p == nil {
		return time.Time{}, fmt.Errorf("热门榜单预热器未初始化")
	}

	currentConfig := p.currentConfig()
	location := currentConfig.Location
	if location == nil {
		location = time.Local
	}
	now = now.In(location)

	target, err := time.ParseInLocation("15:04", currentConfig.DailyTime, location)
	if err != nil {
		return time.Time{}, fmt.Errorf("无效的热门榜单预热时间配置: %w", err)
	}

	nextRun := time.Date(now.Year(), now.Month(), now.Day(), target.Hour(), target.Minute(), 0, 0, location)
	if !nextRun.After(now) {
		nextRun = nextRun.Add(24 * time.Hour)
	}
	return nextRun, nil
}

func (p *HotRankingPreloader) logResult(prefix string, result HotRankingPreloadResult) {
	if result.Failed == 0 {
		log.Printf("%s，总任务=%d，成功=%d", prefix, result.Total, result.Success)
		return
	}

	log.Printf("%s，总任务=%d，成功=%d，失败=%d", prefix, result.Total, result.Success, result.Failed)
	for _, item := range result.Errors {
		log.Printf("热门榜单预热失败: mode=%s period=%s category=%s sort_by=%s err=%v", item.Mode, item.Period, item.Category, item.SortBy, item.Err)
	}
}

func normalizeHotRankingPreloaderConfig(cfg HotRankingPreloaderConfig) HotRankingPreloaderConfig {
	if cfg.DailyTime == "" {
		cfg.DailyTime = "00:00"
	}
	if cfg.Limit <= 0 {
		cfg.Limit = 50
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = 2
	}
	if cfg.Location == nil {
		location, err := time.LoadLocation("Asia/Shanghai")
		if err != nil {
			cfg.Location = time.Local
		} else {
			cfg.Location = location
		}
	}
	return cfg
}

func buildHotRankingPreloadTasks(limit int) []model.HotRankingQuery {
	tasks := make([]model.HotRankingQuery, 0, 56)

	for _, period := range hotRankingTrendPreloadPeriods {
		for _, category := range hotRankingPreloadCategories {
			tasks = append(tasks, model.HotRankingQuery{
				Mode:     model.HotRankingModeTrend,
				Period:   period,
				Category: category,
				SortBy:   model.HotRankingSortByPopularity,
				Page:     1,
				PageSize: limit,
			})
		}
	}

	popularSorts := []model.HotRankingSortBy{
		model.HotRankingSortByPopularity,
		model.HotRankingSortByReleaseDate,
		model.HotRankingSortByVoteAverage,
	}
	for _, period := range hotRankingPopularPreloadPeriods {
		for _, category := range hotRankingPreloadCategories {
			for _, sortBy := range popularSorts {
				tasks = append(tasks, model.HotRankingQuery{
					Mode:     model.HotRankingModePopular,
					Period:   period,
					Category: category,
					SortBy:   sortBy,
					Page:     1,
					PageSize: limit,
				})
			}
		}
	}

	return tasks
}

func (p *HotRankingPreloader) currentConfig() HotRankingPreloaderConfig {
	if p == nil {
		return normalizeHotRankingPreloaderConfig(HotRankingPreloaderConfig{})
	}

	cfg := p.config
	if p.config.ConfigResolver != nil {
		cfg = p.config.ConfigResolver()
		if cfg.ResultHandler == nil {
			cfg.ResultHandler = p.config.ResultHandler
		}
		if cfg.ConfigResolver == nil {
			cfg.ConfigResolver = p.config.ConfigResolver
		}
	}

	return normalizeHotRankingPreloaderConfig(cfg)
}
