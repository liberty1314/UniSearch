package model

// FilterConfig 过滤配置
type FilterConfig struct {
	Include      []string `json:"include,omitempty"`       // 包含关键词列表（OR关系）
	Exclude      []string `json:"exclude,omitempty"`       // 排除关键词列表（任一命中则排除）
	MediaTypes   []string `json:"media_types,omitempty"`   // 媒体类型（OR关系）
	TargetTypes  []string `json:"target_types,omitempty"`  // 目标类型（OR关系）
	Capabilities []string `json:"capabilities,omitempty"`  // 能力标签（OR关系）
}

// SearchRequest 搜索请求参数
type SearchRequest struct {
	Keyword      string                 `json:"kw" binding:"required"` // 搜索关键词
	Channels     []string               `json:"channels"`              // 搜索的频道列表
	Concurrency  int                    `json:"conc"`                  // 并发搜索数量
	ForceRefresh bool                   `json:"refresh"`               // 强制刷新，不使用缓存
	ResultType   string                 `json:"res"`                   // 兼容旧客户端入参；响应始终返回 resources
	SourceType   string                 `json:"src"`                   // 数据来源类型：all(默认，全部来源)、tg(仅Telegram)、plugin(仅插件)
	Plugins      []string               `json:"plugins"`               // 指定搜索的插件列表，不指定则搜索全部插件
	Ext          map[string]interface{} `json:"ext"`                   // 扩展参数，用于传递给插件的自定义参数
	CloudTypes   []string               `json:"cloud_types"`           // 指定返回的网盘类型列表，不指定则返回所有类型
	Filter       *FilterConfig          `json:"filter,omitempty"`      // 过滤配置，用于过滤返回结果
}
