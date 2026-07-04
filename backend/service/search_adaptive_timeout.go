package service

import (
	"time"

	"unisearch/config"
)

// adaptiveTimeoutCalculator 动态超时计算器
// 根据插件历史表现动态调整超时时间，提升用户体验
type adaptiveTimeoutCalculator struct {
	pluginHealthService *PluginHealthService
	baseTimeout         time.Duration
}

// newAdaptiveTimeoutCalculator 创建动态超时计算器
func newAdaptiveTimeoutCalculator(pluginHealthService *PluginHealthService) *adaptiveTimeoutCalculator {
	baseTimeout := 10 * time.Second
	if config.AppConfig != nil && config.AppConfig.PluginTimeout > 0 {
		baseTimeout = config.AppConfig.PluginTimeout
	}

	return &adaptiveTimeoutCalculator{
		pluginHealthService: pluginHealthService,
		baseTimeout:         baseTimeout,
	}
}

// CalculateTimeout 根据插件健康状态计算动态超时时间
// 参数:
//   - pluginName: 插件名称
//
// 返回:
//   - time.Duration: 动态调整后的超时时间
//
// 策略:
//   - 超时率 > 70%: 使用 40% 的基准超时（快速失败）
//   - 超时率 > 50%: 使用 50% 的基准超时
//   - 超时率 > 30%: 使用 70% 的基准超时
//   - 超时率 <= 30%: 使用完整基准超时
func (c *adaptiveTimeoutCalculator) CalculateTimeout(pluginName string) time.Duration {
	if c.pluginHealthService == nil {
		return c.baseTimeout
	}

	status, err := c.pluginHealthService.GetStatus(pluginName)
	if err != nil || status == nil {
		return c.baseTimeout
	}

	timeoutRate := status.TimeoutRate

	// 根据历史超时率动态调整
	switch {
	case timeoutRate > 0.7:
		// 超时率 > 70%：极高超时率，快速失败
		return c.baseTimeout * 4 / 10 // 40%
	case timeoutRate > 0.5:
		// 超时率 > 50%：高超时率，减少等待
		return c.baseTimeout / 2 // 50%
	case timeoutRate > 0.3:
		// 超时率 > 30%：中等超时率，适度减少
		return c.baseTimeout * 7 / 10 // 70%
	default:
		// 超时率 <= 30%：健康状态，使用完整超时
		return c.baseTimeout
	}
}

// ShouldSkipPlugin 判断是否应该跳过该插件
// 超时率过高的插件可以临时跳过，避免阻塞搜索
func (c *adaptiveTimeoutCalculator) ShouldSkipPlugin(pluginName string) bool {
	if c.pluginHealthService == nil {
		return false
	}

	status, err := c.pluginHealthService.GetStatus(pluginName)
	if err != nil || status == nil {
		return false
	}

	// 超时率 > 80% 且连续失败 > 5 次：临时跳过
	return status.TimeoutRate > 0.8 && status.ConsecutiveFailures > 5
}

// GetPluginPriority 获取插件优先级
// 返回值越小，优先级越高（响应快的插件优先）
func (c *adaptiveTimeoutCalculator) GetPluginPriority(pluginName string) int {
	if c.pluginHealthService == nil {
		return 100 // 默认中等优先级
	}

	status, err := c.pluginHealthService.GetStatus(pluginName)
	if err != nil || status == nil {
		return 100
	}

	// 根据历史表现计算优先级
	// 超时率越低，优先级越高
	timeoutRate := status.TimeoutRate
	priority := int(timeoutRate * 100)

	// 如果有连续失败，降低优先级
	if status.ConsecutiveFailures > 0 {
		priority += status.ConsecutiveFailures * 10
	}

	return priority
}

// AdaptiveTimeoutConfig 动态超时配置摘要
type AdaptiveTimeoutConfig struct {
	PluginName     string        `json:"plugin_name"`
	BaseTimeout    time.Duration `json:"base_timeout"`
	ActualTimeout  time.Duration `json:"actual_timeout"`
	TimeoutRate    float64       `json:"timeout_rate"`
	ShouldSkip     bool          `json:"should_skip"`
	Priority       int           `json:"priority"`
	AdjustmentRate float64       `json:"adjustment_rate"` // 调整比例
}

// GetConfig 获取插件的动态超时配置摘要（用于监控和调试）
func (c *adaptiveTimeoutCalculator) GetConfig(pluginName string) AdaptiveTimeoutConfig {
	actualTimeout := c.CalculateTimeout(pluginName)
	shouldSkip := c.ShouldSkipPlugin(pluginName)
	priority := c.GetPluginPriority(pluginName)

	config := AdaptiveTimeoutConfig{
		PluginName:     pluginName,
		BaseTimeout:    c.baseTimeout,
		ActualTimeout:  actualTimeout,
		ShouldSkip:     shouldSkip,
		Priority:       priority,
		AdjustmentRate: float64(actualTimeout) / float64(c.baseTimeout),
	}

	if c.pluginHealthService != nil {
		if status, err := c.pluginHealthService.GetStatus(pluginName); err == nil && status != nil {
			config.TimeoutRate = status.TimeoutRate
		}
	}

	return config
}
