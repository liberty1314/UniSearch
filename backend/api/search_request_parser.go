package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util"
	jsonutil "unisearch/util/json"
)

const (
	maxSearchKeywordLength = 128
	maxSearchPlugins       = 32
	maxSearchChannels      = 128
	maxSearchCloudTypes    = 32
	maxSearchExtBytes      = 8192
	maxSearchExtKeys       = 16
)

var allowedSearchExtKeys = map[string]struct{}{
	"sidhub_base_url": {},
	"title_en":        {},
	"search":          {},
	"debug":           {},
}

func parseSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	var req model.SearchRequest
	var err error

	if c.Request.Method == http.MethodGet {
		req, err = parseGetSearchRequest(c)
	} else {
		req, err = parsePostSearchRequest(c)
	}
	if err != nil {
		return model.SearchRequest{}, err
	}

	normalized := normalizeHTTPSearchRequest(req)
	if err := validateHTTPSearchRequest(normalized); err != nil {
		return model.SearchRequest{}, err
	}
	return normalized, nil
}

func parseGetSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	ext, err := parseExtParam(c.Query("ext"))
	if err != nil {
		return model.SearchRequest{}, err
	}

	filter, err := parseFilterParam(c.Query("filter"))
	if err != nil {
		return model.SearchRequest{}, err
	}

	return model.SearchRequest{
		Keyword:      c.Query("kw"),
		Channels:     splitCommaParam(c.Query("channels")),
		Concurrency:  parseOptionalInt(c.Query("conc")),
		ForceRefresh: strings.TrimSpace(c.Query("refresh")) == "true",
		ResultType:   strings.TrimSpace(c.Query("res")),
		SourceType:   strings.TrimSpace(c.Query("src")),
		Plugins:      splitCommaParam(c.Query("plugins")),
		CloudTypes:   splitCommaParam(c.Query("cloud_types")),
		Ext:          ext,
		Filter:       filter,
	}, nil
}

func parsePostSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	data, err := c.GetRawData()
	if err != nil {
		if isRequestBodyTooLargeError(err) {
			return model.SearchRequest{}, errRequestBodyTooLarge
		}
		return model.SearchRequest{}, searchRequestParseError("读取请求数据失败: " + err.Error())
	}

	var req model.SearchRequest
	if err := jsonutil.Unmarshal(data, &req); err != nil {
		return model.SearchRequest{}, searchRequestParseError("无效的请求参数: " + err.Error())
	}
	return req, nil
}

func normalizeHTTPSearchRequest(req model.SearchRequest) model.SearchRequest {
	if len(req.Channels) == 0 {
		req.Channels = defaultSearchChannels()
	}

	if req.ResultType == "" {
		req.ResultType = "merged_by_type"
	} else if req.ResultType == "merge" {
		req.ResultType = "merged_by_type"
	}

	if req.SourceType == "" {
		req.SourceType = "all"
	}

	if req.SourceType == "tg" {
		req.Plugins = nil
	} else if req.SourceType == "plugin" {
		req.Channels = nil
	} else if req.SourceType == "all" && len(req.Plugins) == 0 {
		req.Plugins = nil
	}

	if req.Ext == nil {
		req.Ext = make(map[string]interface{})
	}

	return req
}

func defaultSearchChannels() []string {
	if tgChannelService != nil {
		dbChannels, err := tgChannelService.GetEnabledChannels()
		if err == nil && len(dbChannels) > 0 {
			return append([]string(nil), dbChannels...)
		}
	}

	if config.AppConfig == nil {
		return nil
	}

	return append([]string(nil), config.AppConfig.DefaultChannels...)
}

func parseExtParam(value string) (map[string]interface{}, error) {
	if strings.TrimSpace(value) == "" {
		return make(map[string]interface{}), nil
	}
	if len(value) > maxSearchExtBytes {
		return nil, searchRequestParseError("ext参数过大")
	}

	ext := make(map[string]interface{})
	if strings.TrimSpace(value) == "{}" {
		return ext, nil
	}

	if err := jsonutil.Unmarshal([]byte(value), &ext); err != nil {
		return nil, searchRequestParseError("无效的ext参数格式: " + err.Error())
	}
	if ext == nil {
		return make(map[string]interface{}), nil
	}
	return ext, nil
}

func validateHTTPSearchRequest(req model.SearchRequest) error {
	if len([]rune(strings.TrimSpace(req.Keyword))) > maxSearchKeywordLength {
		return searchRequestParseError("kw长度超过限制")
	}
	if len(req.Plugins) > maxSearchPlugins {
		return searchRequestParseError("plugins数量超过限制")
	}
	if len(req.Channels) > maxSearchChannels {
		return searchRequestParseError("channels数量超过限制")
	}
	if len(req.CloudTypes) > maxSearchCloudTypes {
		return searchRequestParseError("cloud_types数量超过限制")
	}
	if len(req.Ext) > maxSearchExtKeys {
		return searchRequestParseError("ext键数量超过限制")
	}
	for key := range req.Ext {
		if _, ok := allowedSearchExtKeys[key]; !ok {
			return searchRequestParseError("ext包含未知字段: " + key)
		}
	}
	return nil
}

func parseFilterParam(value string) (*model.FilterConfig, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}

	filter := &model.FilterConfig{}
	if err := jsonutil.Unmarshal([]byte(value), filter); err != nil {
		return nil, searchRequestParseError("无效的filter参数格式: " + err.Error())
	}
	return filter, nil
}

func splitCommaParam(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			items = append(items, trimmed)
		}
	}

	if len(items) == 0 {
		return nil
	}
	return items
}

func parseOptionalInt(value string) int {
	if strings.TrimSpace(value) == "" {
		return 0
	}
	return util.StringToInt(value)
}

type searchRequestParseError string

func (e searchRequestParseError) Error() string {
	return string(e)
}
