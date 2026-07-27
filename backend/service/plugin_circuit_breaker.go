package service

import (
	"fmt"
	"math"
	"sync"
	"time"

	"unisearch/model"
)

type CircuitState string

const (
	CircuitStateClosed   CircuitState = "closed"
	CircuitStateOpen     CircuitState = "open"
	CircuitStateHalfOpen CircuitState = "half_open"
)

type PluginCircuitBreakerConfig struct {
	ConsecutiveFailureThreshold int
	TimeoutRateThreshold        float64
	SlidingWindowSize           int
	SlidingWindowErrorThreshold float64
	HalfOpenSuccessThreshold    int
	MinCooldown                 time.Duration
	MaxCooldown                 time.Duration
}

func defaultPluginCircuitBreakerConfig() PluginCircuitBreakerConfig {
	return PluginCircuitBreakerConfig{
		ConsecutiveFailureThreshold: 5,
		TimeoutRateThreshold:        0.8,
		SlidingWindowSize:           10,
		SlidingWindowErrorThreshold: 0.7,
		HalfOpenSuccessThreshold:    3,
		MinCooldown:                 30 * time.Second,
		MaxCooldown:                 5 * time.Minute,
	}
}

// PluginCircuitBreakerService 负责插件熔断准入和状态迁移。
type PluginCircuitBreakerService struct {
	pluginHealthService *PluginHealthService
	config              PluginCircuitBreakerConfig
	stateLocks          sync.Map
	windows             sync.Map
	now                 func() time.Time
}

func NewPluginCircuitBreakerService(pluginHealthService *PluginHealthService) *PluginCircuitBreakerService {
	return newPluginCircuitBreakerServiceWithConfig(pluginHealthService, defaultPluginCircuitBreakerConfig())
}

func newPluginCircuitBreakerServiceWithConfig(pluginHealthService *PluginHealthService, config PluginCircuitBreakerConfig) *PluginCircuitBreakerService {
	if config.ConsecutiveFailureThreshold <= 0 {
		config.ConsecutiveFailureThreshold = 5
	}
	if config.TimeoutRateThreshold <= 0 {
		config.TimeoutRateThreshold = 0.8
	}
	if config.SlidingWindowSize <= 0 {
		config.SlidingWindowSize = 10
	}
	if config.SlidingWindowErrorThreshold <= 0 {
		config.SlidingWindowErrorThreshold = 0.7
	}
	if config.HalfOpenSuccessThreshold <= 0 {
		config.HalfOpenSuccessThreshold = 3
	}
	if config.MinCooldown <= 0 {
		config.MinCooldown = 30 * time.Second
	}
	if config.MaxCooldown <= 0 {
		config.MaxCooldown = 5 * time.Minute
	}
	return &PluginCircuitBreakerService{
		pluginHealthService: pluginHealthService,
		config:              config,
		now:                 time.Now,
	}
}

func (s *PluginCircuitBreakerService) ShouldAllowRequest(pluginName string) (bool, CircuitState) {
	if s == nil || s.pluginHealthService == nil {
		return true, CircuitStateClosed
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return true, CircuitStateClosed
	}

	lock := s.lockForPlugin(normalizedName)
	lock.Lock()
	defer lock.Unlock()

	status, err := s.pluginHealthService.GetStatus(normalizedName)
	if err != nil || status == nil {
		return true, CircuitStateClosed
	}

	state := normalizeCircuitState(status.CircuitState)
	now := s.now()
	if state == CircuitStateOpen {
		if status.CircuitCooldownUntil != nil && now.Before(*status.CircuitCooldownUntil) {
			return false, CircuitStateOpen
		}
		s.transitionHalfOpen(status, now)
		_ = s.saveStatus(status)
		return true, CircuitStateHalfOpen
	}

	return true, state
}

func (s *PluginCircuitBreakerService) RecordResult(pluginName string, success bool, errMsg string) error {
	source := "search_failure"
	if success {
		source = "search_success"
	} else if isTimeoutHealthResult("", errMsg) {
		source = "timeout"
	}
	return s.RecordResultWithSource(pluginName, success, errMsg, source)
}

func (s *PluginCircuitBreakerService) RecordResultWithSource(pluginName string, success bool, errMsg string, source string) error {
	if s == nil || s.pluginHealthService == nil {
		return nil
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return fmt.Errorf("插件名称不能为空")
	}

	lock := s.lockForPlugin(normalizedName)
	lock.Lock()
	defer lock.Unlock()

	if err := s.pluginHealthService.RecordResult(normalizedName, success, errMsg, source); err != nil {
		return err
	}

	status, err := s.pluginHealthService.GetStatus(normalizedName)
	if err != nil || status == nil {
		return err
	}

	now := s.now()
	state := normalizeCircuitState(status.CircuitState)
	if state == CircuitStateOpen && (success || status.CircuitCooldownUntil == nil || !now.Before(*status.CircuitCooldownUntil)) {
		s.transitionHalfOpen(status, now)
		state = CircuitStateHalfOpen
	}

	s.recordWindowResult(normalizedName, success)
	if success {
		s.applySuccess(status, state)
	} else {
		s.applyFailure(status, state, now)
	}
	return s.saveStatus(status)
}

func (s *PluginCircuitBreakerService) lockForPlugin(pluginName string) *sync.Mutex {
	lock, _ := s.stateLocks.LoadOrStore(pluginName, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

func (s *PluginCircuitBreakerService) saveStatus(status *model.PluginHealthStatus) error {
	if s == nil || s.pluginHealthService == nil || s.pluginHealthService.db == nil || status == nil {
		return nil
	}
	if err := s.pluginHealthService.db.Save(status).Error; err != nil {
		return fmt.Errorf("保存插件熔断状态失败: %w", err)
	}
	return nil
}

func (s *PluginCircuitBreakerService) transitionHalfOpen(status *model.PluginHealthStatus, now time.Time) {
	status.CircuitState = string(CircuitStateHalfOpen)
	status.HalfOpenSuccesses = 0
	status.CircuitCooldownUntil = nil
	status.LastCheckedAt = now
}

func (s *PluginCircuitBreakerService) transitionClosed(status *model.PluginHealthStatus) {
	status.CircuitState = string(CircuitStateClosed)
	status.CircuitOpenedAt = nil
	status.CircuitCooldownUntil = nil
	status.HalfOpenSuccesses = 0
}

func (s *PluginCircuitBreakerService) transitionOpen(status *model.PluginHealthStatus, now time.Time) {
	cooldown := s.cooldownForFailures(status.ConsecutiveFailures)
	cooldownUntil := now.Add(cooldown)
	status.CircuitState = string(CircuitStateOpen)
	status.CircuitOpenedAt = &now
	status.CircuitCooldownUntil = &cooldownUntil
	status.HalfOpenSuccesses = 0
}

func (s *PluginCircuitBreakerService) applySuccess(status *model.PluginHealthStatus, state CircuitState) {
	if state == CircuitStateHalfOpen {
		status.HalfOpenSuccesses++
		if status.HalfOpenSuccesses >= s.config.HalfOpenSuccessThreshold {
			s.transitionClosed(status)
		}
		return
	}
	s.transitionClosed(status)
}

func (s *PluginCircuitBreakerService) applyFailure(status *model.PluginHealthStatus, state CircuitState, now time.Time) {
	if state == CircuitStateHalfOpen {
		s.transitionOpen(status, now)
		return
	}
	if state == CircuitStateOpen {
		s.transitionOpen(status, now)
		return
	}
	if s.shouldOpen(status) {
		s.transitionOpen(status, now)
	}
}

func (s *PluginCircuitBreakerService) shouldOpen(status *model.PluginHealthStatus) bool {
	if status.ConsecutiveFailures >= s.config.ConsecutiveFailureThreshold {
		return true
	}
	if status.TimeoutRate > s.config.TimeoutRateThreshold {
		return true
	}
	window, ok := s.windows.Load(status.PluginName)
	if !ok {
		return false
	}
	results := window.([]bool)
	if len(results) < s.config.SlidingWindowSize {
		return false
	}
	failures := 0
	for _, success := range results {
		if !success {
			failures++
		}
	}
	return float64(failures)/float64(len(results)) > s.config.SlidingWindowErrorThreshold
}

func (s *PluginCircuitBreakerService) recordWindowResult(pluginName string, success bool) {
	value, _ := s.windows.LoadOrStore(pluginName, []bool{})
	results := append(value.([]bool), success)
	if len(results) > s.config.SlidingWindowSize {
		results = results[len(results)-s.config.SlidingWindowSize:]
	}
	s.windows.Store(pluginName, results)
}

func (s *PluginCircuitBreakerService) cooldownForFailures(failures int) time.Duration {
	if failures <= s.config.ConsecutiveFailureThreshold {
		return s.config.MinCooldown
	}
	power := failures - s.config.ConsecutiveFailureThreshold
	multiplier := math.Pow(2, float64(power))
	cooldown := time.Duration(float64(s.config.MinCooldown) * multiplier)
	if cooldown > s.config.MaxCooldown {
		return s.config.MaxCooldown
	}
	return cooldown
}

func normalizeCircuitState(value string) CircuitState {
	switch CircuitState(value) {
	case CircuitStateOpen:
		return CircuitStateOpen
	case CircuitStateHalfOpen:
		return CircuitStateHalfOpen
	default:
		return CircuitStateClosed
	}
}
