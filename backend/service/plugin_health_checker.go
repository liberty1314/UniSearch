package service

import (
	"context"
	"errors"
	"log"
	"time"

	"unisearch/model"
	"unisearch/plugin"
)

type PluginHealthCheckerConfig struct {
	ClosedInterval time.Duration
	OpenInterval   time.Duration
	ProbeTimeout   time.Duration
	Keyword        string
}

func defaultPluginHealthCheckerConfig() PluginHealthCheckerConfig {
	return PluginHealthCheckerConfig{
		ClosedInterval: 5 * time.Minute,
		OpenInterval:   30 * time.Second,
		ProbeTimeout:   5 * time.Second,
		Keyword:        "健康检查",
	}
}

// PluginHealthChecker 定期探测插件健康状态，并驱动熔断器恢复。
type PluginHealthChecker struct {
	searchService  *SearchService
	circuitBreaker *PluginCircuitBreakerService
	config         PluginHealthCheckerConfig
}

func NewPluginHealthChecker(searchService *SearchService, circuitBreaker *PluginCircuitBreakerService) *PluginHealthChecker {
	return newPluginHealthCheckerWithConfig(searchService, circuitBreaker, defaultPluginHealthCheckerConfig())
}

func newPluginHealthCheckerWithConfig(searchService *SearchService, circuitBreaker *PluginCircuitBreakerService, config PluginHealthCheckerConfig) *PluginHealthChecker {
	if config.ClosedInterval <= 0 {
		config.ClosedInterval = 5 * time.Minute
	}
	if config.OpenInterval <= 0 {
		config.OpenInterval = 30 * time.Second
	}
	if config.ProbeTimeout <= 0 {
		config.ProbeTimeout = 5 * time.Second
	}
	if config.Keyword == "" {
		config.Keyword = "健康检查"
	}
	return &PluginHealthChecker{
		searchService:  searchService,
		circuitBreaker: circuitBreaker,
		config:         config,
	}
}

func (c *PluginHealthChecker) Start(ctx context.Context) {
	if c == nil || c.searchService == nil || c.searchService.pluginManager == nil || c.circuitBreaker == nil {
		return
	}
	ticker := time.NewTicker(c.config.OpenInterval)
	go func() {
		defer ticker.Stop()
		c.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *PluginHealthChecker) runOnce(ctx context.Context) {
	if ctx.Err() != nil || c.searchService == nil || c.searchService.pluginManager == nil {
		return
	}
	for _, currentPlugin := range c.searchService.pluginManager.GetPlugins() {
		asyncPlugin, ok := currentPlugin.(plugin.AsyncSearchPlugin)
		if !ok {
			continue
		}
		if !c.shouldProbe(asyncPlugin.Name()) {
			continue
		}
		c.probe(ctx, asyncPlugin)
	}
}

func (c *PluginHealthChecker) shouldProbe(pluginName string) bool {
	status, err := c.circuitBreaker.pluginHealthService.GetStatus(pluginName)
	if err != nil {
		log.Printf("插件健康检查跳过：读取 %s 状态失败: %v", pluginName, err)
		return false
	}
	if status == nil {
		return true
	}
	state := normalizeCircuitState(status.CircuitState)
	now := time.Now()
	if state == CircuitStateOpen {
		if status.CircuitCooldownUntil != nil && now.Before(*status.CircuitCooldownUntil) {
			return false
		}
		return now.Sub(status.LastCheckedAt) >= c.config.OpenInterval
	}
	return now.Sub(status.LastCheckedAt) >= c.config.ClosedInterval
}

func (c *PluginHealthChecker) probe(ctx context.Context, currentPlugin plugin.AsyncSearchPlugin) {
	allowed, state := c.circuitBreaker.ShouldAllowRequest(currentPlugin.Name())
	if !allowed {
		return
	}
	probeCtx, cancel := context.WithTimeout(ctx, c.config.ProbeTimeout)
	defer cancel()

	resultCh := make(chan error, 1)
	go func() {
		_, err := c.searchService.searchSinglePlugin(currentPlugin, c.config.Keyword, nil, "health-check:"+currentPlugin.Name())
		resultCh <- err
	}()

	select {
	case err := <-resultCh:
		if err != nil {
			_ = c.circuitBreaker.RecordResultWithSource(currentPlugin.Name(), false, err.Error(), "system")
			return
		}
		_ = c.circuitBreaker.RecordResultWithSource(currentPlugin.Name(), true, "", "system")
	case <-probeCtx.Done():
		err := probeCtx.Err()
		message := "插件健康检查超时"
		if errors.Is(err, context.Canceled) {
			message = "插件健康检查已取消"
		}
		_ = c.circuitBreaker.RecordResultWithSource(currentPlugin.Name(), false, message, "timeout")
	}
	_ = state
}

func (c *PluginHealthChecker) CheckOnce(ctx context.Context) {
	c.runOnce(ctx)
}

func buildPluginHealthWarning(pluginName string, state CircuitState) model.SearchSourceWarning {
	message := "该搜索源暂时降级，已返回其他来源结果"
	if state == CircuitStateOpen {
		message = "该搜索源已临时熔断，已返回其他来源结果"
	}
	return model.SearchSourceWarning{
		Source:  pluginName,
		Message: message,
	}
}
