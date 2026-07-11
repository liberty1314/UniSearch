package model

import "time"

// ScanTransferInfo 描述需要在移动端扫码转存时的补充访问信息。
type ScanTransferInfo struct {
	Provider       string `json:"provider,omitempty" sonic:"provider,omitempty"`
	QRCodeBase64   string `json:"qr_code_base64,omitempty" sonic:"qr_code_base64,omitempty"`
	QRCodeImageURL string `json:"qr_code_image_url,omitempty" sonic:"qr_code_image_url,omitempty"`
	QRCodeValue    string `json:"qr_code_value,omitempty" sonic:"qr_code_value,omitempty"`
	MobileURL      string `json:"mobile_url,omitempty" sonic:"mobile_url,omitempty"`
	TransferCode   string `json:"transfer_code,omitempty" sonic:"transfer_code,omitempty"`
	Instruction    string `json:"instruction,omitempty" sonic:"instruction,omitempty"`
	SourcePageURL  string `json:"source_page_url,omitempty" sonic:"source_page_url,omitempty"`
	ExpiresHint    string `json:"expires_hint,omitempty" sonic:"expires_hint,omitempty"`
	Refreshable    bool   `json:"refreshable,omitempty" sonic:"refreshable,omitempty"`
	RefreshKey     string `json:"refresh_key,omitempty" sonic:"refresh_key,omitempty"`
}

// Link 网盘链接
type Link struct {
	Type         string            `json:"type" sonic:"type"`
	URL          string            `json:"url" sonic:"url"`
	Password     string            `json:"password" sonic:"password"`
	AccessMode   string            `json:"access_mode,omitempty" sonic:"access_mode,omitempty"`
	ScanTransfer *ScanTransferInfo `json:"scan_transfer,omitempty" sonic:"scan_transfer,omitempty"`
	Datetime     time.Time         `json:"datetime,omitempty" sonic:"datetime,omitempty"`     // 链接更新时间（可选）
	WorkTitle    string            `json:"work_title,omitempty" sonic:"work_title,omitempty"` // 作品标题（用于区分同一消息中多个作品的链接）
}

// SearchResult 搜索结果
type SearchResult struct {
	MessageID      string                 `json:"message_id" sonic:"message_id"`
	UniqueID       string                 `json:"unique_id" sonic:"unique_id"` // 全局唯一ID
	Channel        string                 `json:"channel" sonic:"channel"`
	Datetime       time.Time              `json:"datetime" sonic:"datetime"`
	Title          string                 `json:"title" sonic:"title"`
	Content        string                 `json:"content" sonic:"content"`
	Links          []Link                 `json:"links" sonic:"links"`
	Tags           []string               `json:"tags,omitempty" sonic:"tags,omitempty"`
	Images         []string               `json:"images,omitempty" sonic:"images,omitempty"` // TG消息中的图片链接
	SourcePluginID string                 `json:"source_plugin_id,omitempty" sonic:"source_plugin_id,omitempty"`
	SourceType     string                 `json:"source_type,omitempty" sonic:"source_type,omitempty"`
	SourceName     string                 `json:"source_name,omitempty" sonic:"source_name,omitempty"`
	MediaType      string                 `json:"media_type,omitempty" sonic:"media_type,omitempty"`
	TargetType     string                 `json:"target_type,omitempty" sonic:"target_type,omitempty"`
	DetailURL      string                 `json:"detail_url,omitempty" sonic:"detail_url,omitempty"`
	Capabilities   ResourceCapabilities   `json:"capabilities,omitempty" sonic:"capabilities,omitempty"`
	Actions        []ResourceAction       `json:"actions,omitempty" sonic:"actions,omitempty"`
	Meta           map[string]interface{} `json:"meta,omitempty" sonic:"meta,omitempty"`
}

// ResourceSource 描述资源来自哪个搜索源，供前端统一展示和筛选。
type ResourceSource struct {
	Type     string `json:"type" sonic:"type"`
	ID       string `json:"id,omitempty" sonic:"id,omitempty"`
	Name     string `json:"name,omitempty" sonic:"name,omitempty"`
	Channel  string `json:"channel,omitempty" sonic:"channel,omitempty"`
	PluginID string `json:"plugin_id,omitempty" sonic:"plugin_id,omitempty"`
}

// ResourceLink 描述资源对象内的单个可访问链接。
type ResourceLink struct {
	Type         string            `json:"type" sonic:"type"`
	URL          string            `json:"url" sonic:"url"`
	Password     string            `json:"password,omitempty" sonic:"password,omitempty"`
	AccessMode   string            `json:"access_mode,omitempty" sonic:"access_mode,omitempty"`
	ScanTransfer *ScanTransferInfo `json:"scan_transfer,omitempty" sonic:"scan_transfer,omitempty"`
	Title        string            `json:"title,omitempty" sonic:"title,omitempty"`
	WorkTitle    string            `json:"work_title,omitempty" sonic:"work_title,omitempty"`
	Datetime     time.Time         `json:"datetime,omitempty" sonic:"datetime,omitempty"`
}

// ResourceDetail 承载 UniSearch 内部详情页内容，避免公开响应泄露插件私有字段。
type ResourceDetail struct {
	Content string `json:"content,omitempty" sonic:"content,omitempty"`
}

// ResourceFacets 是资源协议的统一筛选计数。
type ResourceFacets struct {
	CloudTypes   map[string]int `json:"cloud_types" sonic:"cloud_types"`
	SourceTypes  map[string]int `json:"source_types" sonic:"source_types"`
	MediaTypes   map[string]int `json:"media_types" sonic:"media_types"`
	TargetTypes  map[string]int `json:"target_types" sonic:"target_types"`
	Capabilities map[string]int `json:"capabilities" sonic:"capabilities"`
	ActionTypes  map[string]int `json:"action_types" sonic:"action_types"`
}

// ResourceObject 是搜索 HTTP 响应的唯一结果载体。
type ResourceObject struct {
	ID           string                 `json:"id" sonic:"id"`
	Title        string                 `json:"title" sonic:"title"`
	Description  string                 `json:"description,omitempty" sonic:"description,omitempty"`
	Source       ResourceSource         `json:"source" sonic:"source"`
	MediaType    string                 `json:"media_type,omitempty" sonic:"media_type,omitempty"`
	TargetType   string                 `json:"target_type,omitempty" sonic:"target_type,omitempty"`
	Links        []ResourceLink         `json:"links" sonic:"links"`
	Capabilities ResourceCapabilities   `json:"capabilities" sonic:"capabilities"`
	Actions      []ResourceAction       `json:"actions" sonic:"actions"`
	Detail       ResourceDetail         `json:"detail" sonic:"detail"`
	Tags         []string               `json:"tags,omitempty" sonic:"tags,omitempty"`
	Images       []string               `json:"images,omitempty" sonic:"images,omitempty"`
	Meta         map[string]interface{} `json:"meta,omitempty" sonic:"meta,omitempty"`
	PublishedAt  time.Time              `json:"published_at,omitempty" sonic:"published_at,omitempty"`
}

// SearchSourceWarning 描述搜索源级别的非致命失败。
type SearchSourceWarning struct {
	Source  string `json:"source" sonic:"source"`
	Message string `json:"message" sonic:"message"`
}

// MergedLink 合并后的网盘链接
type MergedLink struct {
	URL      string    `json:"url" sonic:"url"`
	Password string    `json:"password" sonic:"password"`
	Note     string    `json:"note" sonic:"note"`
	Datetime time.Time `json:"datetime" sonic:"datetime"`
	Source   string    `json:"source,omitempty" sonic:"source,omitempty"` // 数据来源：tg:频道名 或 plugin:插件名
	Images   []string  `json:"images,omitempty" sonic:"images,omitempty"` // TG消息中的图片链接
}

// MergedLinks 按网盘类型分组的合并链接
type MergedLinks map[string][]MergedLink

// SearchResponse 搜索响应
type SearchResponse struct {
	Total     int                   `json:"total" sonic:"total"`
	Resources []ResourceObject      `json:"resources" sonic:"resources"`
	Facets    ResourceFacets        `json:"facets" sonic:"facets"`
	Warnings  []SearchSourceWarning `json:"warnings,omitempty" sonic:"warnings,omitempty"`
}

// Response API通用响应
type Response struct {
	Code    int         `json:"code" sonic:"code"`
	Message string      `json:"message" sonic:"message"`
	Data    interface{} `json:"data,omitempty" sonic:"data,omitempty"`
}

// NewSuccessResponse 创建成功响应
func NewSuccessResponse(data interface{}) Response {
	return Response{
		Code:    0,
		Message: "success",
		Data:    data,
	}
}

// NewErrorResponse 创建错误响应
func NewErrorResponse(code int, message string) Response {
	return Response{
		Code:    code,
		Message: message,
	}
}
