package model

// PluginConfigField 描述插件运行配置项，供后台插件中心生成说明和表单。
type PluginConfigField struct {
	Key               string      `json:"key" sonic:"key"`
	Label             string      `json:"label" sonic:"label"`
	Type              string      `json:"type" sonic:"type"`
	Required          bool        `json:"required" sonic:"required"`
	Default           interface{} `json:"default,omitempty" sonic:"default,omitempty"`
	Description       string      `json:"description,omitempty" sonic:"description,omitempty"`
	Secret            bool        `json:"secret" sonic:"secret"`
	Group             string      `json:"group,omitempty" sonic:"group,omitempty"`
	Minimum           *float64    `json:"minimum,omitempty" sonic:"minimum,omitempty"`
	Maximum           *float64    `json:"maximum,omitempty" sonic:"maximum,omitempty"`
	Integer           bool        `json:"integer,omitempty" sonic:"integer,omitempty"`
	LessThanOrEqualTo string      `json:"less_than_or_equal_to,omitempty" sonic:"less_than_or_equal_to,omitempty"`
}

// ResourceDescriptor 描述插件产出的资源来源和目标形态。
type ResourceDescriptor struct {
	SourceLabel         string   `json:"source_label" sonic:"source_label"`
	SourceGroup         string   `json:"source_group" sonic:"source_group"`
	SupportedMediaTypes []string `json:"supported_media_types" sonic:"supported_media_types"`
	TargetTypes         []string `json:"target_types" sonic:"target_types"`
	Priority            int      `json:"priority" sonic:"priority"`
	SkipServiceFilter   bool     `json:"skip_service_filter,omitempty" sonic:"skip_service_filter,omitempty"`
}

// PluginUIMetadata 描述插件在后台界面可暴露的入口。
type PluginUIMetadata struct {
	Menus            []string `json:"menus" sonic:"menus"`
	SettingsSections []string `json:"settings_sections" sonic:"settings_sections"`
	TaskTemplates    []string `json:"task_templates" sonic:"task_templates"`
}

// PluginManifest 是 UniSearch 第一版本地插件清单协议。
type PluginManifest struct {
	ID              string              `json:"id" sonic:"id"`
	Name            string              `json:"name" sonic:"name"`
	Version         string              `json:"version" sonic:"version"`
	Category        string              `json:"category" sonic:"category"`
	Description     string              `json:"description" sonic:"description"`
	CoreVersion     string              `json:"core_version" sonic:"core_version"`
	ContractVersion string              `json:"contract_version" sonic:"contract_version"`
	Capabilities    []string            `json:"capabilities" sonic:"capabilities"`
	Permissions     []string            `json:"permissions" sonic:"permissions"`
	ConfigSchema    []PluginConfigField `json:"config_schema" sonic:"config_schema"`
	Resource        ResourceDescriptor  `json:"resource" sonic:"resource"`
	UI              PluginUIMetadata    `json:"ui" sonic:"ui"`
	ManifestStatus  string              `json:"manifest_status" sonic:"manifest_status"`
}

// ResourceCapabilities 描述单条搜索结果支持的后续动作。
type ResourceCapabilities struct {
	Searchable         bool `json:"searchable" sonic:"searchable"`
	OfficialSearchable bool `json:"official_searchable" sonic:"official_searchable"`
	ShareSearchable    bool `json:"share_searchable" sonic:"share_searchable"`
	Downloadable       bool `json:"downloadable" sonic:"downloadable"`
	Strmable           bool `json:"strmable" sonic:"strmable"`
}

// ResourceAction 是搜索结果上可展示或转交给后续任务的动作描述。
type ResourceAction struct {
	Key            string                 `json:"key" sonic:"key"`
	Label          string                 `json:"label" sonic:"label"`
	Type           string                 `json:"type" sonic:"type"`
	Style          string                 `json:"style,omitempty" sonic:"style,omitempty"`
	TargetPluginID string                 `json:"target_plugin_id,omitempty" sonic:"target_plugin_id,omitempty"`
	Payload        map[string]interface{} `json:"payload,omitempty" sonic:"payload,omitempty"`
}
