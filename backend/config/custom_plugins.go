package config

import (
	"encoding/json"
	"os"
	"strings"
	"sync"
)

// CustomPlugin 自定义插件配置
type CustomPlugin struct {
	Name         string   `json:"name"`
	URL          string   `json:"url"`
	Priority     int      `json:"priority"`
	Description  string   `json:"description"`
	Enabled      bool     `json:"enabled"`
	Version      string   `json:"version,omitempty"`
	Category     string   `json:"category,omitempty"`
	Capabilities []string `json:"capabilities,omitempty"`
}

// CustomPluginsConfig 自定义插件配置管理
type CustomPluginsConfig struct {
	Plugins []CustomPlugin `json:"plugins"`
	mu      sync.RWMutex
	path    string
}

var customPluginsInstance *CustomPluginsConfig
var customPluginsOnce sync.Once

const defaultCustomPluginsPath = "./custom_plugins.json"

// GetCustomPluginsConfig 获取自定义插件配置单例
func GetCustomPluginsConfig() *CustomPluginsConfig {
	customPluginsOnce.Do(func() {
		customPluginsInstance = &CustomPluginsConfig{
			Plugins: []CustomPlugin{},
			path:    resolveCustomPluginsPath(),
		}
		customPluginsInstance.Load()
	})
	return customPluginsInstance
}

// ResetCustomPluginsConfigForTest 重置自定义插件配置单例，仅供本地自动化测试隔离使用。
func ResetCustomPluginsConfigForTest() {
	customPluginsInstance = nil
	customPluginsOnce = sync.Once{}
}

func resolveCustomPluginsPath() string {
	if path := strings.TrimSpace(os.Getenv("CUSTOM_PLUGINS_PATH")); path != "" {
		return path
	}
	return defaultCustomPluginsPath
}

// Load 从文件加载配置
func (c *CustomPluginsConfig) Load() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	data, err := os.ReadFile(c.path)
	if err != nil {
		if os.IsNotExist(err) {
			if c.path != defaultCustomPluginsPath {
				if fallbackData, fallbackErr := os.ReadFile(defaultCustomPluginsPath); fallbackErr == nil {
					var fallbackPlugins []CustomPlugin
					if unmarshalErr := json.Unmarshal(fallbackData, &fallbackPlugins); unmarshalErr == nil {
						c.Plugins = fallbackPlugins
						return c.saveWithoutLock()
					}
				}
			}
			// 文件不存在，创建空配置
			c.Plugins = []CustomPlugin{}
			return c.saveWithoutLock()
		}
		return err
	}

	return json.Unmarshal(data, &c.Plugins)
}

// Save 保存配置到文件
func (c *CustomPluginsConfig) Save() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.saveWithoutLock()
}

func (c *CustomPluginsConfig) saveWithoutLock() error {
	data, err := json.MarshalIndent(c.Plugins, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(c.path, data, 0644)
}

// AddPlugin 添加插件
func (c *CustomPluginsConfig) AddPlugin(plugin CustomPlugin) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// 检查是否已存在
	for _, p := range c.Plugins {
		if normalizeCustomPluginName(p.Name) == normalizeCustomPluginName(plugin.Name) {
			return nil // 已存在，不重复添加
		}
	}

	c.Plugins = append(c.Plugins, plugin)
	return c.saveWithoutLock()
}

// RemovePlugin 删除插件
func (c *CustomPluginsConfig) RemovePlugin(name string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for i, p := range c.Plugins {
		if normalizeCustomPluginName(p.Name) == normalizeCustomPluginName(name) {
			c.Plugins = append(c.Plugins[:i], c.Plugins[i+1:]...)
			return c.saveWithoutLock()
		}
	}
	return nil
}

// GetPlugins 获取所有插件
func (c *CustomPluginsConfig) GetPlugins() []CustomPlugin {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make([]CustomPlugin, len(c.Plugins))
	copy(result, c.Plugins)
	return result
}

// GetEnabledPlugins 获取启用的插件
func (c *CustomPluginsConfig) GetEnabledPlugins() []CustomPlugin {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var result []CustomPlugin
	for _, p := range c.Plugins {
		if p.Enabled {
			result = append(result, p)
		}
	}
	return result
}

// UpdatePlugin 更新插件
func (c *CustomPluginsConfig) UpdatePlugin(name string, plugin CustomPlugin) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for i, p := range c.Plugins {
		if normalizeCustomPluginName(p.Name) == normalizeCustomPluginName(name) {
			c.Plugins[i] = plugin
			return c.saveWithoutLock()
		}
	}
	return nil // 插件不存在，静默返回
}

// GetPluginByName 按名称获取插件配置
func (c *CustomPluginsConfig) GetPluginByName(name string) (CustomPlugin, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	normalized := normalizeCustomPluginName(name)
	for _, p := range c.Plugins {
		if normalizeCustomPluginName(p.Name) == normalized {
			return p, true
		}
	}
	return CustomPlugin{}, false
}

// SetPluginEnabled 设置插件启用状态
func (c *CustomPluginsConfig) SetPluginEnabled(name string, enabled bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	normalized := normalizeCustomPluginName(name)
	for i, p := range c.Plugins {
		if normalizeCustomPluginName(p.Name) == normalized {
			c.Plugins[i].Enabled = enabled
			return c.saveWithoutLock()
		}
	}
	return nil
}

func normalizeCustomPluginName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}
