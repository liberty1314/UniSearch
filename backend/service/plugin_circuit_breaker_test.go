package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/plugin"
)

func newCircuitBreakerTestService(t *testing.T) (*PluginHealthService, *PluginCircuitBreakerService, *time.Time) {
	t.Helper()

	healthService := newPluginHealthTestService(t)
	now := time.Date(2026, 7, 4, 22, 0, 0, 0, time.UTC)
	circuit := newPluginCircuitBreakerServiceWithConfig(healthService, PluginCircuitBreakerConfig{
		ConsecutiveFailureThreshold: 2,
		TimeoutRateThreshold:        0.8,
		SlidingWindowSize:           4,
		SlidingWindowErrorThreshold: 0.5,
		HalfOpenSuccessThreshold:    2,
		MinCooldown:                 10 * time.Millisecond,
		MaxCooldown:                 100 * time.Millisecond,
	})
	circuit.now = func() time.Time {
		return now
	}
	return healthService, circuit, &now
}

func TestPluginCircuitBreakerOpensAndRecoversThroughHalfOpen(t *testing.T) {
	healthService, circuit, now := newCircuitBreakerTestService(t)

	if err := circuit.RecordResultWithSource("PanSearch", false, "第一次失败", "search_failure"); err != nil {
		t.Fatalf("记录第一次失败失败: %v", err)
	}
	if err := circuit.RecordResultWithSource("PanSearch", false, "第二次失败", "search_failure"); err != nil {
		t.Fatalf("记录第二次失败失败: %v", err)
	}

	allowed, state := circuit.ShouldAllowRequest("pansearch")
	if allowed || state != CircuitStateOpen {
		t.Fatalf("连续失败后应熔断，allowed=%v state=%s", allowed, state)
	}

	*now = now.Add(20 * time.Millisecond)
	allowed, state = circuit.ShouldAllowRequest("pansearch")
	if !allowed || state != CircuitStateHalfOpen {
		t.Fatalf("冷却后应进入半开，allowed=%v state=%s", allowed, state)
	}

	if err := circuit.RecordResultWithSource("pansearch", true, "", "system"); err != nil {
		t.Fatalf("记录第一次半开成功失败: %v", err)
	}
	status, err := healthService.GetStatus("pansearch")
	if err != nil {
		t.Fatalf("查询状态失败: %v", err)
	}
	if status.CircuitState != string(CircuitStateHalfOpen) || status.HalfOpenSuccesses != 1 {
		t.Fatalf("第一次半开成功后应保持半开，实际为 %#v", status)
	}

	if err := circuit.RecordResultWithSource("pansearch", true, "", "system"); err != nil {
		t.Fatalf("记录第二次半开成功失败: %v", err)
	}
	status, err = healthService.GetStatus("pansearch")
	if err != nil {
		t.Fatalf("查询恢复状态失败: %v", err)
	}
	if status.CircuitState != string(CircuitStateClosed) || status.CircuitCooldownUntil != nil {
		t.Fatalf("半开连续成功后应闭合，实际为 %#v", status)
	}
}

func TestPluginCircuitBreakerHalfOpenFailureReopens(t *testing.T) {
	healthService, circuit, now := newCircuitBreakerTestService(t)

	if err := circuit.RecordResultWithSource("unstable", false, "第一次失败", "search_failure"); err != nil {
		t.Fatalf("记录第一次失败失败: %v", err)
	}
	if err := circuit.RecordResultWithSource("unstable", false, "第二次失败", "search_failure"); err != nil {
		t.Fatalf("记录第二次失败失败: %v", err)
	}
	*now = now.Add(20 * time.Millisecond)
	allowed, state := circuit.ShouldAllowRequest("unstable")
	if !allowed || state != CircuitStateHalfOpen {
		t.Fatalf("冷却后应进入半开，allowed=%v state=%s", allowed, state)
	}
	if err := circuit.RecordResultWithSource("unstable", false, "半开探测失败", "system"); err != nil {
		t.Fatalf("记录半开失败失败: %v", err)
	}

	status, err := healthService.GetStatus("unstable")
	if err != nil {
		t.Fatalf("查询状态失败: %v", err)
	}
	if status.CircuitState != string(CircuitStateOpen) {
		t.Fatalf("半开失败后应重新熔断，实际为 %#v", status)
	}
}

func TestPluginCircuitBreakerSlidingWindowCanOpen(t *testing.T) {
	_, circuit, _ := newCircuitBreakerTestService(t)
	for _, success := range []bool{false, true, false, false} {
		if err := circuit.RecordResultWithSource("window-plugin", success, "窗口失败", "search_failure"); err != nil {
			t.Fatalf("记录窗口结果失败: %v", err)
		}
	}

	allowed, state := circuit.ShouldAllowRequest("window-plugin")
	if allowed || state != CircuitStateOpen {
		t.Fatalf("滑动窗口错误率过高后应熔断，allowed=%v state=%s", allowed, state)
	}
}

func TestPluginSearchExecutorSkipsOpenCircuitPlugin(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        1,
		AsyncMaxBackgroundWorkers: 1,
		PluginTimeout:             100 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	healthService, circuit, _ := newCircuitBreakerTestService(t)
	if err := circuit.RecordResultWithSource("open-plugin", false, "第一次失败", "search_failure"); err != nil {
		t.Fatalf("记录第一次失败失败: %v", err)
	}
	if err := circuit.RecordResultWithSource("open-plugin", false, "第二次失败", "search_failure"); err != nil {
		t.Fatalf("记录第二次失败失败: %v", err)
	}

	mockPlugin := &mockAsyncSearchPlugin{name: "open-plugin"}
	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(mockPlugin)

	metrics := newSearchMetricsRecorder()
	executor := newPluginSearchExecutorWithMetrics(newPluginSelector(manager, nil), newSearchCache(nil, metrics), metrics, nil, healthService, nil, circuit)
	results, warnings, err := executor.Search("仙逆", nil, true, 1, nil)
	if err != nil {
		t.Fatalf("搜索不应返回错误: %v", err)
	}
	if len(results) != 0 || len(warnings) != 1 {
		t.Fatalf("熔断插件应被跳过，results=%d warnings=%#v", len(results), warnings)
	}
	if mockPlugin.SearchCalls() != 0 {
		t.Fatalf("熔断插件不应被调用，实际调用 %d 次", mockPlugin.SearchCalls())
	}
}

func TestPluginHealthCheckerRecordsProbeResult(t *testing.T) {
	healthService := newPluginHealthTestService(t)
	circuit := newPluginCircuitBreakerServiceWithConfig(healthService, PluginCircuitBreakerConfig{
		ConsecutiveFailureThreshold: 1,
		TimeoutRateThreshold:        0.8,
		SlidingWindowSize:           2,
		SlidingWindowErrorThreshold: 0.5,
		HalfOpenSuccessThreshold:    1,
		MinCooldown:                 time.Millisecond,
		MaxCooldown:                 time.Millisecond,
	})

	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(&mockAsyncSearchPlugin{name: "checker-plugin", err: errors.New("探测失败")})
	searchService := NewSearchService(manager, nil, nil)
	searchService.SetPluginHealthService(healthService)
	searchService.SetPluginCircuitBreaker(circuit)
	checker := newPluginHealthCheckerWithConfig(searchService, circuit, PluginHealthCheckerConfig{
		ClosedInterval: time.Millisecond,
		OpenInterval:   time.Millisecond,
		ProbeTimeout:   50 * time.Millisecond,
		Keyword:        "健康检查",
	})

	checker.CheckOnce(context.Background())
	status, err := healthService.GetStatus("checker-plugin")
	if err != nil {
		t.Fatalf("查询探测状态失败: %v", err)
	}
	if status == nil || status.CircuitState != string(CircuitStateOpen) {
		t.Fatalf("探测失败应打开熔断，实际为 %#v", status)
	}
}
