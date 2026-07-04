package model

import "time"

// PluginCatalogInstall 描述市场条目的安装方式；当前仅支持 custom_url。
type PluginCatalogInstall struct {
	Type string `json:"type" sonic:"type"`
	URL  string `json:"url,omitempty" sonic:"url,omitempty"`
}

// PluginHealthSnapshot 是插件中心展示最近健康检查的稳定快照。
type PluginHealthSnapshot struct {
	IsHealthy            bool       `json:"is_healthy" sonic:"is_healthy"`
	LastCheckedAt        time.Time  `json:"last_checked_at,omitempty" sonic:"last_checked_at,omitempty"`
	LastError            string     `json:"last_error,omitempty" sonic:"last_error,omitempty"`
	CheckSource          string     `json:"check_source,omitempty" sonic:"check_source,omitempty"`
	CircuitState         string     `json:"circuit_state,omitempty" sonic:"circuit_state,omitempty"`
	CircuitCooldownUntil *time.Time `json:"circuit_cooldown_until,omitempty" sonic:"circuit_cooldown_until,omitempty"`
}

// PluginCatalogItem 是插件中心统一条目，合并本地状态与远程市场元数据。
type PluginCatalogItem struct {
	ID               string                `json:"id" sonic:"id"`
	Name             string                `json:"name" sonic:"name"`
	Version          string                `json:"version" sonic:"version"`
	Category         string                `json:"category" sonic:"category"`
	Description      string                `json:"description" sonic:"description"`
	Manifest         PluginManifest        `json:"manifest" sonic:"manifest"`
	ConfigSchema     []PluginConfigField   `json:"config_schema,omitempty" sonic:"config_schema,omitempty"`
	Install          PluginCatalogInstall  `json:"install,omitempty" sonic:"install,omitempty"`
	Tags             []string              `json:"tags,omitempty" sonic:"tags,omitempty"`
	Homepage         string                `json:"homepage,omitempty" sonic:"homepage,omitempty"`
	Author           string                `json:"author,omitempty" sonic:"author,omitempty"`
	SourceType       string                `json:"source_type" sonic:"source_type"`
	PluginType       string                `json:"plugin_type,omitempty" sonic:"plugin_type,omitempty"`
	URL              string                `json:"url,omitempty" sonic:"url,omitempty"`
	IsLocal          bool                  `json:"is_local" sonic:"is_local"`
	IsRemote         bool                  `json:"is_remote" sonic:"is_remote"`
	Installed        bool                  `json:"installed" sonic:"installed"`
	IsEnabled        bool                  `json:"is_enabled" sonic:"is_enabled"`
	Status           string                `json:"status" sonic:"status"`
	Health           *PluginHealthSnapshot `json:"health,omitempty" sonic:"health,omitempty"`
	AvailableActions []string              `json:"available_actions" sonic:"available_actions"`
}

// PluginCatalogResponse 是插件中心 catalog 接口响应。
type PluginCatalogResponse struct {
	Version string              `json:"version" sonic:"version"`
	Source  string              `json:"source" sonic:"source"`
	Items   []PluginCatalogItem `json:"items" sonic:"items"`
}

// PluginCatalogInstallRequest 安装远程市场条目的请求。
type PluginCatalogInstallRequest struct {
	ID string `json:"id" binding:"required" sonic:"id"`
}
