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
	RefreshHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error)
}

type HotRankingPreloaderConfig struct {
	Enabled     bool
	DailyTime   string
	Timeout     time.Duration
	Concurrency int
	Location    *time.Location
}

type HotRankingPreloadError struct {
	Period   model.HotRankingPeriod
	Category model.HotRankingCategory
	Err      error
}

type HotRankingPreloadResult struct {
	Total   int
	Success int
	Failed  int
	Errors  []HotRankingPreloadError
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
	result := HotRankingPreloadResult{
		Total: (len(hotRankingTrendPreloadPeriods) + len(hotRankingPopularPreloadPeriods)) * len(hotRankingPreloadCategories),
	}
	if p == nil || !p.config.Enabled || p.refreshService == nil {
		return result
	}

	type task struct {
		period   model.HotRankingPeriod
		category model.HotRankingCategory
	}

	taskCh := make(chan task)
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

	for i := 0; i < p.config.Concurrency; i++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for item := range taskCh {
				taskCtx := ctx
				cancel := func() {}
				if p.config.Timeout > 0 {
					taskCtx, cancel = context.WithTimeout(ctx, p.config.Timeout)
				}

				if p.cache != nil {
					_ = p.cache.ClearByPrefix(taskCtx, "hot-ranking:v2")
				}
				_, err := p.refreshService.RefreshHotRankings(taskCtx, item.period, item.category)
				cancel()
				resultCh <- HotRankingPreloadError{
					Period:   item.period,
					Category: item.category,
					Err:      err,
				}
			}
		}()
	}

	for _, period := range hotRankingTrendPreloadPeriods {
		for _, category := range hotRankingPreloadCategories {
			select {
			case <-ctx.Done():
				close(taskCh)
				workers.Wait()
				close(resultCh)
				collector.Wait()
				return result
			case taskCh <- task{period: period, category: category}:
			}
		}
	}

	for _, period := range hotRankingPopularPreloadPeriods {
		for _, category := range hotRankingPreloadCategories {
			select {
			case <-ctx.Done():
				close(taskCh)
				workers.Wait()
				close(resultCh)
				collector.Wait()
				return result
			case taskCh <- task{period: period, category: category}:
			}
		}
	}

	close(taskCh)
	workers.Wait()
	close(resultCh)
	collector.Wait()
	return result
}

func (p *HotRankingPreloader) Start(ctx context.Context) {
	if p == nil || !p.config.Enabled || p.refreshService == nil {
		return
	}

	go func() {
		for {
			nextRun, err := p.NextRun(time.Now().In(p.config.Location))
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
			p.logResult("每日热门榜单预热完成", result)
		}
	}()
}

func (p *HotRankingPreloader) NextRun(now time.Time) (time.Time, error) {
	if p == nil {
		return time.Time{}, fmt.Errorf("热门榜单预热器未初始化")
	}

	location := p.config.Location
	if location == nil {
		location = time.Local
	}
	now = now.In(location)

	target, err := time.ParseInLocation("15:04", p.config.DailyTime, location)
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
		log.Printf("热门榜单预热失败: period=%s category=%s err=%v", item.Period, item.Category, item.Err)
	}
}

func normalizeHotRankingPreloaderConfig(cfg HotRankingPreloaderConfig) HotRankingPreloaderConfig {
	if cfg.DailyTime == "" {
		cfg.DailyTime = "10:00"
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
